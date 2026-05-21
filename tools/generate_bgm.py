from __future__ import annotations

import math
import random
import shutil
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "audio"
SAMPLE_RATE = 44_100
BPM = 96
BEAT = 60.0 / BPM
BARS = 8
BEATS_PER_BAR = 4
DURATION = BARS * BEATS_PER_BAR * BEAT
SAMPLE_COUNT = int(DURATION * SAMPLE_RATE)


THEMES = {
    "center": {
        "file": "bgm_center.wav",
        "seed": 99091,
        "root": 45,
        "scale": [0, 2, 3, 7, 9],
        "pluck": 0.13,
        "flute": 0.09,
        "drum": 0.24,
        "bell": 0.025,
        "wind": 0.028,
        "speed": 1.0,
    },
    "left": {
        "file": "bgm_left.wav",
        "seed": 99092,
        "root": 50,
        "scale": [0, 2, 5, 7, 10],
        "pluck": 0.09,
        "flute": 0.14,
        "drum": 0.12,
        "bell": 0.052,
        "wind": 0.04,
        "speed": 0.82,
    },
    "right": {
        "file": "bgm_right.wav",
        "seed": 99093,
        "root": 43,
        "scale": [0, 1, 5, 7, 8],
        "pluck": 0.12,
        "flute": 0.07,
        "drum": 0.38,
        "bell": 0.018,
        "wind": 0.045,
        "speed": 1.08,
    },
    "battle": {
        "file": "bgm_battle.wav",
        "seed": 99094,
        "root": 43,
        "scale": [0, 1, 3, 7, 8],
        "pluck": 0.16,
        "flute": 0.045,
        "drum": 0.55,
        "bell": 0.012,
        "wind": 0.025,
        "speed": 1.35,
    },
    "victory": {
        "file": "bgm_victory.wav",
        "seed": 99095,
        "root": 55,
        "scale": [0, 2, 4, 7, 9],
        "pluck": 0.12,
        "flute": 0.14,
        "drum": 0.14,
        "bell": 0.08,
        "wind": 0.012,
        "speed": 0.96,
    },
}


class Track:
    def __init__(self, theme: dict[str, float | int | list[int] | str]) -> None:
        self.theme = theme
        self.rng = random.Random(int(theme["seed"]))
        self.left = [0.0] * SAMPLE_COUNT
        self.right = [0.0] * SAMPLE_COUNT

    def midi_to_freq(self, midi: int) -> float:
        return 440.0 * (2.0 ** ((midi - 69) / 12.0))

    def pan_gains(self, pan: float) -> tuple[float, float]:
        angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
        return math.cos(angle), math.sin(angle)

    def add(self, index: int, sample: float, pan: float) -> None:
        if 0 <= index < SAMPLE_COUNT:
            lg, rg = self.pan_gains(pan)
            self.left[index] += sample * lg
            self.right[index] += sample * rg

    def beat_time(self, bar: int, beat: float = 0.0) -> float:
        speed = float(self.theme["speed"])
        return (bar * BEATS_PER_BAR + beat) * BEAT / speed

    def note(self, degree: int, octave: int = 0) -> int:
        scale = self.theme["scale"]
        assert isinstance(scale, list)
        return int(self.theme["root"]) + 12 * octave + scale[degree % len(scale)]

    def add_pluck(self, start: float, midi: int, duration: float, amp: float, pan: float) -> None:
        start_i = int(start * SAMPLE_RATE)
        count = max(1, int(duration * SAMPLE_RATE))
        freq = self.midi_to_freq(midi)
        phase_offset = self.rng.random() * math.tau

        for i in range(count):
            index = start_i + i
            if index >= SAMPLE_COUNT:
                break
            t = i / SAMPLE_RATE
            attack = min(0.008, duration * 0.12)
            env = t / attack if t < attack else math.exp(-5.8 * (t - attack) / max(0.001, duration - attack))
            env *= max(0.0, 1.0 - (t / duration) ** 1.7)
            phase = math.tau * freq * t + phase_offset
            tone = (
                0.92 * math.sin(phase)
                + 0.36 * math.sin(phase * 2.0 + 0.3)
                + 0.16 * math.sin(phase * 3.0 + 0.9)
                + 0.06 * math.sin(phase * 5.0)
            )
            transient = (self.rng.random() * 2.0 - 1.0) * math.exp(-80.0 * t)
            self.add(index, math.tanh((tone + transient * 0.25) * 1.65) * env * amp, pan)

    def add_flute(self, start: float, midi: int, duration: float, amp: float, pan: float) -> None:
        start_i = int(start * SAMPLE_RATE)
        count = max(1, int(duration * SAMPLE_RATE))
        freq = self.midi_to_freq(midi)
        breath = 0.0

        for i in range(count):
            index = start_i + i
            if index >= SAMPLE_COUNT:
                break
            t = i / SAMPLE_RATE
            attack = min(0.06, duration * 0.2)
            release = min(0.14, duration * 0.35)
            env = 1.0
            if t < attack:
                env = t / attack
            if duration - t < release:
                env *= max(0.0, (duration - t) / release)
            vibrato = 0.08 * math.sin(math.tau * 5.2 * t)
            phase = math.tau * freq * t + vibrato
            breath = breath * 0.94 + (self.rng.random() * 2.0 - 1.0) * 0.06
            tone = math.sin(phase) + 0.18 * math.sin(phase * 2.0 + 0.8)
            self.add(index, (tone * 0.82 + breath * 0.18) * env * amp, pan)

    def add_drum(self, start: float, amp: float, pan: float, tight: bool = False) -> None:
        start_i = int(start * SAMPLE_RATE)
        duration = 0.42 if tight else 0.72
        count = int(duration * SAMPLE_RATE)

        for i in range(count):
            index = start_i + i
            if index >= SAMPLE_COUNT:
                break
            t = i / SAMPLE_RATE
            env = math.exp((-8.0 if tight else -5.4) * t)
            freq = (128.0 if tight else 92.0) * math.exp(-3.2 * t) + 38.0
            body = math.sin(math.tau * freq * t) * env
            skin = (self.rng.random() * 2.0 - 1.0) * math.exp(-42.0 * t)
            self.add(index, (body * 1.2 + skin * 0.16) * amp, pan)

    def add_bell(self, start: float, midi: int, amp: float, pan: float) -> None:
        start_i = int(start * SAMPLE_RATE)
        count = int(1.6 * SAMPLE_RATE)
        freq = self.midi_to_freq(midi)

        for i in range(count):
            index = start_i + i
            if index >= SAMPLE_COUNT:
                break
            t = i / SAMPLE_RATE
            env = math.exp(-3.6 * t)
            tone = math.sin(math.tau * freq * t) + 0.58 * math.sin(math.tau * freq * 2.01 * t)
            self.add(index, tone * env * amp, pan)

    def add_pad(self, start: float, midi_notes: list[int], duration: float, amp: float, pan: float) -> None:
        start_i = int(start * SAMPLE_RATE)
        count = max(1, int(duration * SAMPLE_RATE))
        freqs = [self.midi_to_freq(m) for m in midi_notes]
        phases = [self.rng.random() * math.tau for _ in midi_notes]

        for i in range(count):
            index = start_i + i
            if index >= SAMPLE_COUNT:
                break
            t = i / SAMPLE_RATE
            attack = min(0.42, duration * 0.22)
            release = min(0.6, duration * 0.28)
            env = 1.0
            if t < attack:
                env = 0.5 - 0.5 * math.cos(math.pi * t / attack)
            if duration - t < release:
                env *= max(0.0, (duration - t) / release)
            tone = 0.0
            for freq, phase in zip(freqs, phases):
                tone += math.sin(math.tau * freq * t + phase)
                tone += 0.18 * math.sin(math.tau * freq * 2.0 * t + phase * 0.7)
            self.add(index, tone / len(freqs) * env * amp, pan)

    def compose(self) -> None:
        pluck = float(self.theme["pluck"])
        flute = float(self.theme["flute"])
        drum = float(self.theme["drum"])
        bell = float(self.theme["bell"])
        is_battle = self.theme["file"] == "bgm_battle.wav"
        is_victory = self.theme["file"] == "bgm_victory.wav"

        for section in range(2):
            start_bar = section * 4
            chord = [self.note(0, 0), self.note(2, 0), self.note(4, 0)]
            if is_victory:
                chord.append(self.note(1, 1))
            self.add_pad(self.beat_time(start_bar), chord, BEAT * 15.4, 0.12 if is_victory else 0.095, -0.18)

        pattern = [0, 2, 4, 2, 1, 3, 4, 3]
        if is_victory:
            pattern = [0, 1, 2, 4, 3, 4, 2, 1]
        for bar in range(BARS):
            for step, degree in enumerate(pattern):
                start = self.beat_time(bar, step * 0.5)
                amp = pluck * (1.16 if step in (0, 4) else 0.84)
                self.add_pluck(start, self.note(degree, 1), BEAT * 0.74, amp, -0.28 if step % 2 == 0 else 0.23)

            self.add_drum(self.beat_time(bar, 0), drum, -0.08, tight=is_battle)
            self.add_drum(self.beat_time(bar, 2), drum * (0.7 if is_battle else 0.52), 0.12, tight=is_battle)
            if is_battle:
                self.add_drum(self.beat_time(bar, 1.5), drum * 0.42, 0.28, tight=True)
                self.add_drum(self.beat_time(bar, 3.5), drum * 0.42, -0.25, tight=True)

            if bar % 2 == 1:
                self.add_bell(self.beat_time(bar, 3.7), self.note(4, 3), bell, -0.42)
            if is_victory and bar % 2 == 0:
                self.add_bell(self.beat_time(bar, 1.95), self.note(2, 3), bell * 0.74, 0.36)

            if is_victory and bar in (0, 2, 4, 6):
                motif = [(0.15, 0, 0.42), (0.85, 1, 0.36), (1.5, 2, 0.46), (2.35, 4, 0.64)]
                for offset, degree, dur_beats in motif:
                    self.add_flute(self.beat_time(bar, offset), self.note(degree, 2), dur_beats * BEAT, flute, 0.2)
            elif bar in (1, 5) and not is_battle:
                motif = [(0.25, 2, 0.54), (1.05, 3, 0.42), (1.75, 4, 0.58), (2.8, 2, 0.62)]
                for offset, degree, dur_beats in motif:
                    self.add_flute(self.beat_time(bar, offset), self.note(degree, 2), dur_beats * BEAT, flute, 0.18)
            elif is_battle and bar in (2, 6):
                self.add_flute(self.beat_time(bar, 0.5), self.note(4, 2), BEAT * 0.42, flute, 0.18)
                self.add_flute(self.beat_time(bar, 1.1), self.note(3, 2), BEAT * 0.36, flute, 0.12)

    def add_wind(self) -> None:
        wind_amp = float(self.theme["wind"])
        for i in range(SAMPLE_COUNT):
            t = i / SAMPLE_RATE
            edge = min(1.0, i / (SAMPLE_RATE * 0.06), (SAMPLE_COUNT - i - 1) / (SAMPLE_RATE * 0.06))
            low = math.sin(math.tau * self.midi_to_freq(self.note(0, -1)) * t) * 0.55
            fifth = math.sin(math.tau * self.midi_to_freq(self.note(3, -1)) * t + 0.9) * 0.25
            slow = 0.62 + 0.38 * math.sin(math.tau * 0.07 * t + 1.6)
            noise = (self.rng.random() * 2.0 - 1.0) * 0.01
            sample = (low + fifth + noise) * slow * edge * wind_amp
            self.left[i] += sample * 0.72
            self.right[i] += sample * 0.64

    def apply_delay(self) -> None:
        original_left = self.left[:]
        original_right = self.right[:]
        for seconds, gain, pan in ((0.27, 0.07, -0.34), (0.42, 0.05, 0.4)):
            delay = int(seconds * SAMPLE_RATE)
            lg, rg = self.pan_gains(pan)
            for i in range(delay, SAMPLE_COUNT):
                self.left[i] += original_right[i - delay] * gain * lg
                self.right[i] += original_left[i - delay] * gain * rg

    def finalize(self) -> None:
        fade = int(0.05 * SAMPLE_RATE)
        for i in range(fade):
            gain = 0.5 - 0.5 * math.cos(math.pi * i / max(1, fade - 1))
            end = SAMPLE_COUNT - 1 - i
            self.left[i] *= gain
            self.right[i] *= gain
            self.left[end] *= gain
            self.right[end] *= gain

        peak = max(max(abs(v) for v in self.left), max(abs(v) for v in self.right), 1e-9)
        scale = 0.92 / peak
        for i in range(SAMPLE_COUNT):
            self.left[i] *= scale
            self.right[i] *= scale

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            frames = bytearray()
            for l_val, r_val in zip(self.left, self.right):
                frames += struct.pack(
                    "<hh",
                    int(max(-1.0, min(1.0, l_val)) * 32767),
                    int(max(-1.0, min(1.0, r_val)) * 32767),
                )
            wav.writeframes(frames)


def render_theme(name: str, theme: dict[str, float | int | list[int] | str]) -> Path:
    track = Track(theme)
    track.compose()
    track.add_wind()
    track.apply_delay()
    track.finalize()
    out = OUT_DIR / str(theme["file"])
    track.write(out)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    outputs = [render_theme(name, theme) for name, theme in THEMES.items()]
    shutil.copyfile(OUT_DIR / "bgm_center.wav", OUT_DIR / "bgm.wav")
    for path in outputs:
        print(f"Wrote {path} ({DURATION:.1f}s, {SAMPLE_RATE} Hz, stereo)")
    print(f"Wrote {OUT_DIR / 'bgm.wav'} as center-theme compatibility copy")


if __name__ == "__main__":
    main()

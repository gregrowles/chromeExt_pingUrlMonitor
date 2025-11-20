#!/usr/bin/env python3
"""
Generate warning-style icon files for the Chrome extension without external deps.
Creates a navy background with a yellow warning triangle + dark exclamation mark.
"""

import os
import struct
import zlib

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")
OUTPUT_SIZES = [16, 48, 128]

COLOR_BG_TOP = (15, 23, 42, 255)   # navy
COLOR_BG_BOTTOM = (30, 41, 59, 255)
COLOR_TRIANGLE = (251, 191, 36, 255)  # amber
COLOR_TRIANGLE_BORDER = (217, 119, 6, 255)  # darker amber
COLOR_EXCLAMATION = (15, 23, 42, 255)  # dark navy
COLOR_HIGHLIGHT = (255, 255, 255, 60)


def lerp_color(color_a, color_b, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(color_a, color_b))


def make_canvas(width, height):
    canvas = []
    for y in range(height):
        t = y / max(1, height - 1)
        row_color = lerp_color(COLOR_BG_TOP, COLOR_BG_BOTTOM, t)
        row = [row_color for _ in range(width)]
        canvas.append(row)
    return canvas


def draw_triangle(pixels, color, border_color):
    height = len(pixels)
    width = len(pixels[0])
    top_y = int(height * 0.18)
    bottom_y = int(height * 0.88)
    half_base = width * 0.45
    center_x = width / 2

    for y in range(top_y, bottom_y):
        progress = (y - top_y) / max(1, bottom_y - top_y)
        half_width = half_base * progress
        x_left = int(center_x - half_width)
        x_right = int(center_x + half_width)
        for x in range(max(0, x_left), min(width, x_right + 1)):
            pixels[y][x] = color

    # Border (slightly bigger triangle)
    border_offset = max(1, width // 40)
    for y in range(top_y - border_offset, bottom_y + border_offset):
        progress = (y - (top_y - border_offset)) / max(1, (bottom_y + border_offset) - (top_y - border_offset))
        half_width = (half_base + border_offset) * progress
        x_left = int(center_x - half_width)
        x_right = int(center_x + half_width)
        if 0 <= y < height:
            for x in range(max(0, x_left), min(width, x_right + 1)):
                if not (top_y <= y < bottom_y and
                        (center_x - half_base * ((y - top_y) / max(1, bottom_y - top_y))) <= x <=
                        (center_x + half_base * ((y - top_y) / max(1, bottom_y - top_y)))):
                    pixels[y][x] = border_color


def draw_exclamation(pixels):
    height = len(pixels)
    width = len(pixels[0])
    center_x = width // 2

    bar_top = int(height * 0.35)
    bar_bottom = int(height * 0.68)
    bar_half_width = max(1, width // 18)

    for y in range(bar_top, bar_bottom):
        for x in range(center_x - bar_half_width, center_x + bar_half_width + 1):
            if 0 <= x < width:
                pixels[y][x] = COLOR_EXCLAMATION

    dot_radius = max(1, width // 16)
    dot_center_y = int(height * 0.78)
    for y in range(dot_center_y - dot_radius, dot_center_y + dot_radius + 1):
        for x in range(center_x - dot_radius, center_x + dot_radius + 1):
            if 0 <= x < width and 0 <= y < height:
                if (x - center_x) ** 2 + (y - dot_center_y) ** 2 <= dot_radius ** 2:
                    pixels[y][x] = COLOR_EXCLAMATION


def add_highlight(pixels):
    height = len(pixels)
    width = len(pixels[0])
    highlight_height = max(1, height // 8)
    for y in range(highlight_height):
        strength = 1 - (y / highlight_height)
        for x in range(width):
            r, g, b, a = pixels[y][x]
            hr, hg, hb, ha = COLOR_HIGHLIGHT
            pixels[y][x] = (
                min(255, int(r + hr * strength)),
                min(255, int(g + hg * strength)),
                min(255, int(b + hb * strength)),
                a
            )


def write_png(path, pixels):
    height = len(pixels)
    width = len(pixels[0])
    raw_data = bytearray()
    for row in pixels:
        raw_data.append(0)  # filter type 0
        for r, g, b, a in row:
            raw_data.extend([r, g, b, a])

    compressed = zlib.compress(bytes(raw_data))

    def chunk(chunk_type, data):
        chunk_len = struct.pack(">I", len(data))
        crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
        return chunk_len + chunk_type + data + crc

    png_data = bytearray(b"\x89PNG\r\n\x1a\n")
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png_data.extend(chunk(b"IHDR", ihdr))
    png_data.extend(chunk(b"IDAT", compressed))
    png_data.extend(chunk(b"IEND", b""))

    with open(path, "wb") as f:
        f.write(png_data)


def generate_icon(size):
    pixels = make_canvas(size, size)
    draw_triangle(pixels, COLOR_TRIANGLE, COLOR_TRIANGLE_BORDER)
    draw_exclamation(pixels)
    add_highlight(pixels)
    return pixels


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    for size in OUTPUT_SIZES:
        pixels = generate_icon(size)
        out_path = os.path.join(ICONS_DIR, f"icon{size}.png")
        write_png(out_path, pixels)
        print(f"Generated {out_path}")


if __name__ == "__main__":
    main()


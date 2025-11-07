#!/usr/bin/env python3
"""
Optimize fighter photos by resizing and compressing them.
Reduces file size for faster web loading.
"""
import os
from PIL import Image
import glob

FIGHTERS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public", "fighters")

MAX_SIZE = 200
QUALITY = 85  

def optimize_image(filepath):
    """Resize and compress a single image"""
    try:
        img = Image.open(filepath)
        original_size = os.path.getsize(filepath)

        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background

        if img.width > MAX_SIZE or img.height > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)

        img.save(filepath, 'JPEG', quality=QUALITY, optimize=True)

        new_size = os.path.getsize(filepath)
        reduction = ((original_size - new_size) / original_size) * 100

        print(f"✓ {os.path.basename(filepath)}: {original_size//1024}KB → {new_size//1024}KB (-{reduction:.1f}%)")
        return original_size, new_size

    except Exception as e:
        print(f"✗ Error optimizing {filepath}: {e}")
        return 0, 0

def main():
    if not os.path.exists(FIGHTERS_DIR):
        print(f"Error: Directory not found: {FIGHTERS_DIR}")
        return

    image_files = glob.glob(os.path.join(FIGHTERS_DIR, "*.jpg"))

    if not image_files:
        print("No images found to optimize")
        return

    print(f"Optimizing {len(image_files)} fighter photos...\n")

    total_before = 0
    total_after = 0

    for filepath in sorted(image_files):
        before, after = optimize_image(filepath)
        total_before += before
        total_after += after

    total_reduction = ((total_before - total_after) / total_before) * 100 if total_before > 0 else 0

    print(f"\n✓ Complete!")
    print(f"Total size: {total_before//1024//1024}MB → {total_after//1024//1024}MB")
    print(f"Saved: {(total_before - total_after)//1024//1024}MB (-{total_reduction:.1f}%)")

if __name__ == "__main__":
    main()

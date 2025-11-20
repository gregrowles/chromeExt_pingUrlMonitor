#!/usr/bin/env python3
"""
Generate icon files for the Chrome extension.
Requires Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw
    import os
    
    def create_icon(size):
        # Create a new image with blue background
        img = Image.new('RGB', (size, size), color='#3B82F6')
        draw = ImageDraw.Draw(img)
        
        center_x = size // 2
        center_y = size // 2
        radius = int(size * 0.35)
        
        # Draw outer circle
        outer_bbox = [
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius
        ]
        draw.ellipse(outer_bbox, outline='white', width=max(1, int(size * 0.08)))
        
        # Draw inner circle
        inner_radius = int(radius * 0.6)
        inner_bbox = [
            center_x - inner_radius,
            center_y - inner_radius,
            center_x + inner_radius,
            center_y + inner_radius
        ]
        draw.ellipse(inner_bbox, outline='white', width=max(1, int(size * 0.08)))
        
        # Draw center dot
        dot_radius = max(1, int(size * 0.1))
        dot_bbox = [
            center_x - dot_radius,
            center_y - dot_radius,
            center_x + dot_radius,
            center_y + dot_radius
        ]
        draw.ellipse(dot_bbox, fill='white')
        
        # Draw ping lines (radar sweep)
        import math
        line_width = max(1, int(size * 0.05))
        for i in range(4):
            angle = (math.pi * 2 * i) / 4
            end_x = center_x + int(math.cos(angle) * radius)
            end_y = center_y + int(math.sin(angle) * radius)
            draw.line([center_x, center_y, end_x, end_y], fill='white', width=line_width)
        
        return img
    
    # Create icons directory if it doesn't exist
    icons_dir = 'icons'
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate icons
    for size in [16, 48, 128]:
        icon = create_icon(size)
        icon_path = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(icon_path, 'PNG')
        print(f'Generated {icon_path}')
    
    print('All icons generated successfully!')
    
except ImportError:
    print('Pillow is not installed. Please install it with: pip install Pillow')
    print('Or use generate-icons.html in a browser to generate the icons.')
except Exception as e:
    print(f'Error generating icons: {e}')
    print('You can also use generate-icons.html in a browser to generate the icons.')


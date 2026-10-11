# 앱 아이콘(냉장고 그림) PNG 만들기: python tools/make_icons.py
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"


def draw(size):
    s = 1024
    img = Image.new("RGB", (s, s), "#2f80ed")
    d = ImageDraw.Draw(img)
    # 냉장고 몸통
    x0, y0, x1, y1 = 300, 170, 724, 860
    d.rounded_rectangle((x0, y0, x1, y1), radius=70, fill="#ffffff")
    # 문 나누는 선 (위 냉동, 아래 냉장)
    d.rectangle((x0, 405, x1, 425), fill="#2f80ed")
    # 손잡이
    d.rounded_rectangle((365, 260, 395, 350), radius=15, fill="#9cc3f7")
    d.rounded_rectangle((365, 480, 395, 640), radius=15, fill="#9cc3f7")
    # 발
    d.rounded_rectangle((350, 850, 410, 890), radius=12, fill="#ffffff")
    d.rounded_rectangle((614, 850, 674, 890), radius=12, fill="#ffffff")
    # 유통기한 표시 동그라미
    d.ellipse((560, 660, 760, 860), fill="#ff8a3d", outline="#2f80ed", width=24)
    d.rounded_rectangle((650, 700, 670, 770), radius=10, fill="#ffffff")
    d.rounded_rectangle((650, 760, 715, 780), radius=10, fill="#ffffff")
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
draw(192).save(OUT / "icon-192.png")
draw(512).save(OUT / "icon-512.png")
draw(180).save(OUT / "apple-touch-icon.png")
print("icons done")

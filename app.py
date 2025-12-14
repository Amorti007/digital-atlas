from flask import Flask, send_from_directory
import os

# Statik dosyaların nerede olduğunu belirtiyoruz.
# Görseline göre senin dosyaların 'public/src' altında.
STATIC_FOLDER = 'public'

app = Flask(__name__, static_folder=STATIC_FOLDER)

# 1. Ana Sayfa Rotası (siteye girince index.html açılsın)
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# 2. Diğer Dosyalar ve SPA Yönlendirmesi
@app.route('/<path:path>')
def serve_static(path):
    # İstenen dosya (örn: css/main.css veya about.html) gerçekten var mı?
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # EĞER SPA İSE: Dosya bulunamazsa (örn: kullanıcı sayfayı yenilediğinde)
    # 404 hatası vermek yerine tekrar index.html'i döndür.
    # Bu, React/Vue gibi SPA'ların çalışması için kritiktir.
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run()
from flask import Flask, send_from_directory
import os

# Statik dosyaların nerede olduğunu belirtiyoruz.
STATIC_FOLDER = 'public'

app = Flask(__name__, static_folder=STATIC_FOLDER)

# Site anasayfası için index.html dosyasını sunma
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Diğer dosyalar içn SPA desteği ile birlikte statik dosyaları sunma
@app.route('/<path:path>')
def serve_static(path):
    # İstenen dosya var mı kontrol et
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Dosya yoksa (Örneğin sayfa yenilendiğinde) index.html dosyasını döndür (SPA desteği)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run()
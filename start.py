import http.server
import socketserver
import os
import webbrowser

PORT = 8000

# Меняем рабочую директорию на папку скрипта
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 Python сервер запущен!")
    print(f"🌐 Откройте: http://localhost:{PORT}")
    print(f"📁 Папка: {os.getcwd()}")
    print("\n📋 Содержимое папки:")
    for file in os.listdir('.'):
        print(f"  - {file}")
    
    # Автоматически открываем браузер
    webbrowser.open(f'http://localhost:{PORT}')
    
    print("\n⚡ Сервер работает. Нажмите Ctrl+C для остановки")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен")
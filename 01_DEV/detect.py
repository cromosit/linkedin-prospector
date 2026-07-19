import os
import filetype

filepath = r"C:\Users\Samuel\.gemini\antigravity-ide\brain\fbfecf0b-f996-4e97-aacc-ff145138d6a3\uploaded_media_1784480100203.img"
print("File size:", os.path.getsize(filepath))
try:
    kind = filetype.guess(filepath)
    if kind is None:
        print('Cannot guess file type!')
    else:
        print('File extension:', kind.extension)
        print('File MIME type:', kind.mime)
except Exception as e:
    print("Error:", e)

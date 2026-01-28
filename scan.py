import os

# --- 設定 ---
# 解析したいNext.jsプロジェクトのルートパス（このスクリプトをプロジェクト直下で動かすなら '.'）
ROOT_DIR = '.'
# AIに送る必要のないディレクトリやファイル
EXCLUDE_DIRS = {'.next', 'node_modules', '.git', 'public', 'styles'}
EXCLUDE_FILES = {'package-lock.json', 'favicon.ico', '.gitignore', 'README.md'}
# 対象とする拡張子
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'}
# 出力ファイル名
OUTPUT_FILE = 'project_context_for_ai.txt'

def generate_tree(path, indent=''):
    tree_str = ""
    items = sorted(os.listdir(path))
    
    for i, item in enumerate(items):
        if item in EXCLUDE_DIRS or item in EXCLUDE_FILES:
            continue
            
        full_path = os.path.join(path, item)
        is_last = i == len(items) - 1
        marker = '└── ' if is_last else '├── '
        
        tree_str += f"{indent}{marker}{item}\n"
        
        if os.path.isdir(full_path):
            new_indent = indent + ('    ' if is_last else '│   ')
            tree_str += generate_tree(full_path, new_indent)
            
    return tree_str

def get_file_content(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Error reading file: {e}"

def main():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("# Project Structure\n\n```text\n")
        out.write(generate_tree(ROOT_DIR))
        out.write("```\n\n---\n\n")

        for root, dirs, files in os.walk(ROOT_DIR):
            # 除外ディレクトリをスキップ
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in sorted(files):
                if any(file.endswith(ext) for ext in EXTENSIONS) and file not in EXCLUDE_FILES:
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, ROOT_DIR)
                    
                    out.write(f"## File: {relative_path}\n")
                    out.write(f"```{os.path.splitext(file)[1][1:] or 'text'}\n")
                    out.write(get_file_content(full_path))
                    out.write("\n```\n\n")

    print(f"Done! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

# python scan.py
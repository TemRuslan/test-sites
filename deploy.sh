#!/bin/zsh
# Выкладка сайта на тест: ./deploy.sh partner  ->  https://temruslan.github.io/test-sites/partner/
# Берёт папку ../<имя>, кладёт копию в <имя>/, закрывает от поиска, коммитит и пушит.
set -e
cd "${0:A:h}"
name="$1"
src="../$name"
[[ -n "$name" && -d "$src" ]] || { echo "Нет папки $src"; exit 1; }
rsync -a --delete \
  --exclude '.DS_Store' --exclude '.git*' --exclude '.claude' --exclude '.htaccess' --exclude '*.php' \
  --exclude '*.md' --exclude '*.zip' --exclude '*.sh' --exclude '*.pdf' --exclude '*.docx' \
  --exclude 'img/raw' --exclude 'old' --exclude 'robots.txt' --exclude 'sitemap.xml' \
  "$src/" "$name/"
# закрыть тестовую копию от поисковиков
for f in "$name"/**/*.html(N); do
  grep -q 'name="robots"' "$f" || sed -i '' 's|<head>|<head>\n<meta name="robots" content="noindex, nofollow">|' "$f"
done
git add -A "$name"
if git diff --cached --quiet; then echo "Изменений нет"; else
  git commit -q -m "Тест: обновить $name

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  git push -q
fi
echo "https://temruslan.github.io/test-sites/$name/"

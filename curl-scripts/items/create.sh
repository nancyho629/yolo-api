API="http://localhost:4741"
URL_PATH="/items"

curl "${API}${URL_PATH}" \
  --include \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "item": {
      "title": "'"${TITLE}"'",
      "description": "'"${DESC}"'",
      "completed": "'"${DONE}"'"
    }
  }'

echo

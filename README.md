# process-graylog (local + Lambda-ready)

## Local run (Git Bash)

1. Create a `.env` file (do not commit it) with:
- GRAYLOG_URL
- GRAYLOG_TOKEN
- GRAYLOG_STREAM_TITLE
- GRAYLOG_SEARCH_JSON
- WEBDB_BASE_URL
- WEBDB_INSECURE_TLS (true/false)
- CONCURRENCY

2. Install deps:
```bash
npm install
```

3. Run:
```bash
npm start
```

## Lambda
- Handler: `src/handler.handler`
- Configure env vars in Lambda (do not use `.env` in Lambda).

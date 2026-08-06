# ChatScan API reference

## Record a message commitment

```bash
curl -s -X POST http://localhost:3847/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","protocol":"X11-C7"}'
```

Response shape:

```json
{
  "id": 15,
  "hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "ref": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/15",
  "protocol": "X11-C7",
  "status": "pending",
  "chain": "X11",
  "encrypted": true,
  "content": null
}
```

## Rejected plaintext attempt

```bash
curl -s -X POST http://localhost:3847/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","message":"secret"}'
```

Returns `400` with `code: "PLAINTEXT_FORBIDDEN"`.

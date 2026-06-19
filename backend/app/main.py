{
  "experimentalServices": {
    "frontend": {
      "root": "frontend",
      "routePrefix": "/",
      "framework": "vite"
    },
    "backend": {
      "root": "backend",
      "routePrefix": "/_backend",
      "framework": "fastapi",
      "entrypoint": "app/main.py"
    }
  },
  "rewrites": [
    { "source": "/_backend/(.*)", "destination": "/_backend/$1" }
  ]
}
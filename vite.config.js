import { defineConfig } from 'vite'
import { resolve, basename } from 'path'
import { readdirSync, readFileSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs'

// Plugin to process content files: copy settings, generate index files for folder collections
function contentPlugin() {
  const contentSrc = resolve(__dirname, 'src/content')
  const folders = ['diensten', 'team', 'reviews', 'announcements', 'vacatures']

  function processContent(outDir) {
    const contentOut = resolve(outDir, 'content')

    // Copy settings files
    const settingsOut = resolve(contentOut, 'settings')
    mkdirSync(settingsOut, { recursive: true })
    const settingsSrc = resolve(contentSrc, 'settings')
    if (existsSync(settingsSrc)) {
      for (const f of readdirSync(settingsSrc).filter(f => f.endsWith('.json'))) {
        copyFileSync(resolve(settingsSrc, f), resolve(settingsOut, f))
      }
    }

    // For each folder collection, read all JSON files and generate an index.json array
    for (const folder of folders) {
      const folderOut = resolve(contentOut, folder)
      mkdirSync(folderOut, { recursive: true })
      const folderSrc = resolve(contentSrc, folder)
      if (!existsSync(folderSrc)) {
        writeFileSync(resolve(folderOut, 'index.json'), '[]')
        continue
      }
      const files = readdirSync(folderSrc).filter(f => f.endsWith('.json'))
      const items = files.map(f => {
        const data = JSON.parse(readFileSync(resolve(folderSrc, f), 'utf-8'))
        data._file = f
        return data
      })
      // Sort by sort field if present
      items.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      writeFileSync(resolve(folderOut, 'index.json'), JSON.stringify(items))
      // Also copy individual files
      for (const f of files) {
        copyFileSync(resolve(folderSrc, f), resolve(folderOut, f))
      }
    }
  }

  return {
    name: 'content-plugin',
    // For dev server, serve content from src/content
    configureServer(server) {
      server.middlewares.use('/content', (req, res, next) => {
        // Handle index.json requests for folder collections
        for (const folder of folders) {
          if (req.url === `/${folder}/index.json`) {
            const folderSrc = resolve(contentSrc, folder)
            if (!existsSync(folderSrc)) {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end('[]')
              return
            }
            const files = readdirSync(folderSrc).filter(f => f.endsWith('.json'))
            const items = files.map(f => {
              const data = JSON.parse(readFileSync(resolve(folderSrc, f), 'utf-8'))
              data._file = f
              return data
            })
            items.sort((a, b) => (a.sort || 0) - (b.sort || 0))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(items))
            return
          }
        }
        // Serve individual files from src/content
        const filePath = resolve(contentSrc, req.url.slice(1))
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(content)
          return
        }
        next()
      })
    },
    // For build, process content into dist
    closeBundle() {
      processContent(resolve(__dirname, 'dist'))
    }
  }
}

export default defineConfig({
  plugins: [contentPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html'
      }
    }
  }
})

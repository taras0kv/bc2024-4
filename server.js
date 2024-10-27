const http = require('http')
const { Command } = require('commander')
const fs = require('fs').promises
const path = require('path')
const superagent = require('superagent')
const program = new Command()

program
	.requiredOption('-h, --host <host>', 'Адреса сервера')
	.requiredOption('-p, --port <port>', 'Порт сервера', parseInt)
	.requiredOption('-c, --cache <path>', 'Шлях до директорії кешу')

program.parse(process.argv)

const { host, port, cache } = program.opts()

const server = http.createServer(async (req, res) => {
	const httpCode = path.basename(req.url)

	// Перевірка на валідний код
	if (!/^\d{3}$/.test(httpCode)) {
		res.writeHead(400, { 'Content-Type': 'text/plain' })
		return res.end('Bad Request')
	}

	const cachePath = path.join(cache, `${httpCode}.jpg`)

	switch (req.method) {
		case 'GET':
			try {
				const data = await fs.readFile(cachePath)
				res.writeHead(200, { 'Content-Type': 'image/jpeg' })
				res.end(data)
			} catch (err) {
				try {
					// Завантаження зображення з http.cat у разі відсутності в кеші
					const response = await superagent.get(`https://http.cat/${httpCode}`)
					const imageData = response.body

					await fs.writeFile(cachePath, imageData) // Зберігаємо в кеші
					res.writeHead(200, { 'Content-Type': 'image/jpeg' })
					res.end(imageData)
				} catch (error) {
					res.writeHead(404, { 'Content-Type': 'text/plain' })
					res.end('Not Found')
				}
			}
			break

		case 'PUT':
			try {
				const chunks = []
				req.on('data', chunk => chunks.push(chunk))
				req.on('end', async () => {
					const data = Buffer.concat(chunks)
					await fs.writeFile(cachePath, data)
					res.writeHead(201, { 'Content-Type': 'text/plain' })
					res.end('Created')
				})
			} catch (err) {
				res.writeHead(500, { 'Content-Type': 'text/plain' })
				res.end('Internal Server Error')
			}
			break

		case 'DELETE':
			try {
				await fs.unlink(cachePath)
				res.writeHead(200, { 'Content-Type': 'text/plain' })
				res.end('Deleted')
			} catch (err) {
				res.writeHead(404, { 'Content-Type': 'text/plain' })
				res.end('Not Found')
			}
			break

		default:
			res.writeHead(405, { 'Content-Type': 'text/plain' })
			res.end('Method Not Allowed')
			break
	}
})

server.listen(port, host, () => {
	console.log(`Сервер запущено на http://${host}:${port}`)
})

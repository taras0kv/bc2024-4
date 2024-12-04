const http = require('http')
const fs = require('fs').promises
const path = require('path')
const superagent = require('superagent')
const { Command } = require('commander')

const program = new Command()

program
	.requiredOption('-h, --host <type>', 'Server host address')
	.requiredOption('-p, --port <number>', 'Server port')
	.requiredOption('-c, --cache <path>', 'Cache directory path')

program.parse(process.argv)

const options = program.opts()

// Директорія кешу
const cacheDirectory = path.resolve(options.cache)

// Перевіряємо наявність директорії кешу
fs.mkdir(cacheDirectory, { recursive: true })
	.then(() => {
		console.log('Кеш директорія створена або вже існує.')
	})
	.catch(err => {
		console.error('Помилка при створенні директорії кешу:', err)
	})

// Створюємо сервер
const server = http.createServer(async (req, res) => {
	const statusCode = req.url?.substring(1) // Отримуємо код статусу з URL

	if (!statusCode) {
		res.writeHead(400, { 'Content-Type': 'text/plain' })
		return res.end('Bad Request: Status code is required.')
	}

	const cacheFilePath = path.join(cacheDirectory, `${statusCode}.jpg`)

	switch (req.method) {
		case 'GET':
			try {
				// Спробуємо зчитати зображення з кешу
				const imageData = await fs.readFile(cacheFilePath)
				res.writeHead(200, { 'Content-Type': 'image/jpeg' })
				res.end(imageData)
			} catch (err) {
				if (err.code === 'ENOENT') {
					// Якщо зображення не знайдено в кеші, отримуємо його з http.cat
					try {
						const response = await superagent.get(
							`https://http.cat/${statusCode}`
						)
						await fs.writeFile(cacheFilePath, response.body) // Записуємо у кеш
						res.writeHead(200, { 'Content-Type': 'image/jpeg' })
						res.end(response.body)
					} catch (error) {
						res.writeHead(404, { 'Content-Type': 'text/plain' })
						res.end('Not Found: Unable to retrieve image from http.cat.')
					}
				} else {
					res.writeHead(500, { 'Content-Type': 'text/plain' })
					res.end('Internal Server Error: Unable to read from cache.')
				}
			}
			break

		case 'PUT':
			let body = []
			req
				.on('data', chunk => {
					body.push(chunk)
				})
				.on('end', async () => {
					try {
						await fs.writeFile(cacheFilePath, Buffer.concat(body)) // Записуємо зображення у кеш
						res.writeHead(201, { 'Content-Type': 'text/plain' })
						res.end('Created: Image cached successfully.')
					} catch (err) {
						res.writeHead(500, { 'Content-Type': 'text/plain' })
						res.end('Internal Server Error: Unable to write to cache.')
					}
				})
			break

		case 'DELETE':
			try {
				await fs.unlink(cacheFilePath) // Видаляємо зображення з кешу
				res.writeHead(200, { 'Content-Type': 'text/plain' })
				res.end('OK: Image deleted from cache.')
			} catch (err) {
				if (err.code === 'ENOENT') {
					res.writeHead(404, { 'Content-Type': 'text/plain' })
					res.end('Not Found: Image not found in cache.')
				} else {
					res.writeHead(500, { 'Content-Type': 'text/plain' })
					res.end('Internal Server Error: Unable to delete from cache.')
				}
			}
			break

		default:
			res.writeHead(405, { 'Content-Type': 'text/plain' })
			res.end('Method Not Allowed')
			break
	}
})

// Запускаємо сервер
server.listen(options.port, options.host, () => {
	console.log(`Сервер запущено на http://${options.host}:${options.port}`)
})

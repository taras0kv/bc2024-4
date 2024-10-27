const http = require('http')
const { Command } = require('commander')
const program = new Command()

// Налаштування параметрів командного рядка
program
	.requiredOption('-h, --host <host>', 'Адреса сервера')
	.requiredOption('-p, --port <port>', 'Порт сервера', parseInt)
	.requiredOption('-c, --cache <path>', 'Шлях до директорії кешу')

program.parse(process.argv)

// Отримання параметрів
const { host, port, cache } = program.opts()

// Перевірка параметрів
if (!host || !port || !cache) {
	console.error('Всі параметри є обовʼязковими: --host, --port, --cache')
	process.exit(1)
}

// Створення веб-сервера
const server = http.createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end('Проксі-сервер.\n')
})

// Запуск сервера
server.listen(port, host, () => {
	console.log(`Сервер запущено на http://${host}:${port}`)
})

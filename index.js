import readline from 'readline' // модуль для ввода с клавиатуры
import fetch from 'node-fetch' // модуль для http запросов
import {exec} from 'child_process'; // модуль для выполнения команд

const apiURL = 'http://localhost:3500/api' // адрес сервера логирования

// создание потоков ввода вывода
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// start основная функция
function start() {
    // запрос ввода команды
    rl.question('Введите команду: ', async (command) => {
        if (command.toLowerCase() === 'выход') { // условие для выхода из ввода команд
            rl.close(); // закрытие потока ввода
            return
        }
        await handleCommand(command) // обработка введенной команды
        start();  // рекурсия основной функции для непрерывного ввода команд
    });
}

// handleCommand функция обработки команд через switch case
async function handleCommand(command) {
    // переменную command привожу к нижнему регистру, чтобы ввод не зависел от регистра
    switch (command.toLowerCase()) {
        case 'help': // help команда вывода справки по командам
            // вывод справки по командам
            console.log('\nДоступные команды:\n\nstatus – текущий статус программы\nuptime – время работы программы\nping – утилита ping\nip – узнать свой ip\ngeoip – узнать свое местоположение по ip\nвыход – завершить программу\n')
            await sendLogs('info', `show help`) // вызов функции отправки логов на сервер
            break
        case 'status': // status команда для получения статуса
            const status = 'Running...' // статус программы запущен, т.к. она запущена
            console.log(status); // вывод статуса в консоль
            await sendLogs('info', `check status: ${status}`) // вызов функции отправки логов на сервер
            break;

        case 'uptime': // uptime команда для получения времени работы программы
            const uptime = process.uptime() // получение и запись времени работы программы в переменую uptime
            console.log(`Время работы программы: ${uptime} seconds`); // вывод uptime в консоль
            await sendLogs('info', `check uptime: ${uptime}`) // вызов функции отправки логов на сервер
            break;

        case 'ping': // ping команда для пингования
            let address = await new Promise(resolve => rl.question('Введите IP или домен для ping: ', resolve)); // ввод адреса (ip или домен) для ping
            const { stdout } = await execPromise(`ping -c 3 ${address}`); // вызов функции для выполнения команды "ping"
            console.log(stdout); // вывод результатов ping'a в консоль
            await sendLogs('info', `ping ${address}`) // вызов функции отправки логов на сервер
            break;

        case 'ip': // ip команда для получения своего ip
            const ip = await getIP(); // вызов функции получения IP
            console.log(`Ваш IP: ${ip}`); // вывод IP в консоль
            await sendLogs('info', `get ip: ${ip}`) // вызов функции отправки логов на сервер
            break;

        case 'geoip': // geoip команда для получения своего местоположения по ip
            const geo = await getGeoIP(); // вызов функции получения местоположения по IP
            console.log(`Ваше местоположение: ${geo.city}, ${geo.country}`); // вывод местоположения в консоль
            await sendLogs('info', `get geoip: ${geo.city}, ${geo.country}`) // вызов функции отправки логов на сервер
            break;

        default: // дефолтный кейс для обработки неизвестных команд
            console.log('Неизвестная команда'); // вывод сообщения о неизвестной команде в консоль
            await sendLogs('warn', `unknown command: ${command}`) // вызов функции отправки логов на сервер
            break;
    }
}

// execPromise функция для выполнения переданной команды с возвращением promise, чтобы программа дождалась результатов ping'a
function execPromise(command) {
    // тут обычная функция exec обернут в promise
    return new Promise((resolve, reject) => {
        // exec это функция для выполнения команд
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// getIP функция для отправки запроса к API для получения IP
async function getIP() {
    // params это queryParams, они приплюсовываются к URL перед запросом
    const params = new URLSearchParams({
        format: 'json' // параметр, который требуется для запроса к api.ipify.org
    })
    let response = await fetch('https://api.ipify.org?' + params); // отправка запроса
    let data = await response.json(); // получение ответа
    return data['ip']; // возвращаем ip
}

// getGeoIP функция для отправки запроса к API получения местоположения по IP
async function getGeoIP() {
    const ip = await getIP() // получаем IP
    let response = await fetch(`https://freegeoip.app/json/${ip}`); // отправляем запрос к API geoip
    let data = await response.json(); // обрабатываем ответ
    return { // возвращаем город и страну
        city: data['city'],
        country: data['country_name'],
    };
}

// sendRequest фунция для отправки запросов. Входные параметры это параметры запроса - http метод, URL путь, заголовки и тело запроса
async function sendRequest(method, route, headers, body) {
    // формирование объекта для параметров запроса
    const options = {
        method: method,
        body: body,
        headers: headers,
    }
    try {
        const response = await fetch(apiURL + route, options); // отправка запроса. Здесь в аргументах apiURL складывается с route чтобы получить нужный полный URL
        return await response.json() // обработка ответа
    } catch (error) {
        console.error('Error sending request:', error); // обработка ошибки
    }
}

// sendLogs функция отпарвки логов. Входыне параметры это уровень логирования level и сообщение message
async function sendLogs(level, message) {
    // формирование json тело для запроса
    const body = JSON.stringify({
        "data": {
            "level": level,
            "message": message
        }
    })
    const headers = {'Content-Type': 'application/json'} // формирвоание заголовков
    try {
        return await sendRequest('POST', '/logs', headers, body) // вызов функции отправки запроса. Передаем метод POST, route /logs, заголовки и тело запроса
    } catch (error) {
        console.error('Error sending logs:', error); // обработка ошибки
    }
}
// вывод справки по командам
console.log('\nДоступные команды:\n\nstatus – текущий статус программы\nuptime – время работы программы\nping – утилита ping\nip – узнать свой ip\ngeoip – узнать свое местоположение по ip\nвыход – завершить программу\n')
start() // запуск основной функции
await sendLogs('info', 'Client started').then(r => {}); // вызов функции отправки логов. Передали сообщение - "Клиент запущен"
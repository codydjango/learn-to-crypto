// bank.js
const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const path = require('path')
const sodium = require('sodium-native')

const RESET = false

class Log {
    static getLogPath() {
        return path.join(path.dirname(__dirname), '/log.json')
    }

    static loadLog(reset=false) {
        if (reset) return []
        try {
            return JSON.parse(fs.readFileSync(Log.getLogPath()))
        } catch (err) {
            return []
        }
    }

    static saveLog(data) {
        fs.writeFileSync(Log.getLogPath(), JSON.stringify(data, null, 2))
    }

    static hashToHex(stringData) {
        const inputBuf = Buffer.from(stringData)
        const outputBuf = Buffer.alloc(sodium.crypto_generichash_BYTES)

        sodium.crypto_generichash(outputBuf, inputBuf)

        return outputBuf.toString('hex')
    }

    constructor() {
        this._log = Log.loadLog(RESET)
    }

    logMsg(msg) {
        this.add(msg)
        this.save()
    }

    add(msg) {
        this._log.push({
            value: msg,
            hash: Log.hashToHex(JSON.stringify(msg))
        })
    }

    save() {
        Log.saveLog(this.dump())
    }

    dump() {
        return this._log
    }
}

class Bank {
    static calculateBalanceFromLog(log) {
        return log.map(entry => entry.value).reduce((acc, current) => {
                switch (current.cmd) {
                    case 'deposit':
                        acc += current.amount
                        break
                    case 'withdraw':
                        acc -= current.amount
                        break
                }

                return acc
            }, 0)
    }

    constructor(log) {
        this._log = log
        this._balance = this.recalculateBalance(this._log)
        console.log('initialBalance', this._balance);
    }

    recalculateBalance(log) {
        return Bank.calculateBalanceFromLog(log.dump())
    }

    getBalance(recalculate=false) {
        if (recalculate) {
            this._balance = this.recalculateBalance(this._log)
        }

        return this._balance
    }

    logMsg(msg) {
        console.log('log', msg)
        this._log.logMsg(msg)
    }

    deposit(msg) {
        console.log('deposit', msg, this._balance)
        this._balance += msg.amount
        this.logMsg(msg)
    }

    withdraw(msg) {
        console.log('withdraw', msg, this._balance)
        this._balance -= msg.amount
        this.logMsg(msg)
    }

    canWithdraw(amount) {
        return (this.getBalance() >= amount)
    }

    canDeposit(amount) {
        return (amount >= 0)
    }
}

const log = new Log()
const bank = new Bank(log)

// console.log('log', log)
// console.log('bank', bank)

const server = net.createServer(socket => {
    socket = jsonStream(socket)

    socket.on('data', function (msg) {
        console.log('Bank received:', msg)
        // socket.write can be used to send a reply

        const nope = () => {socket.write({ err: 'nope' })}

        switch (msg.cmd) {
            case 'deposit':
                (bank.canDeposit(msg.amount)) ? bank.deposit(msg) : nope()
                break
            case 'withdraw':
                (bank.canWithdraw(msg.amount)) ? bank.withdraw(msg) : nope()
                break
            case 'balance':
                break
            default:
                break
        }

        socket.write({
            cmd: 'balance',
            balance: bank.getBalance() })
    })
})

server.listen(3876)

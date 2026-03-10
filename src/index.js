import { Command } from 'commander'
import { WechatyBuilder, ScanStatus, log } from 'wechaty'
import inquirer from 'inquirer'
import qrTerminal from 'qrcode-terminal'
import dotenv from 'dotenv'

import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { defaultMessage } from './wechaty/sendMessage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 🌟 修改1：优先读取系统环境变量（Render配置的），兼容本地.env
dotenv.config() // 加载本地.env（如果有），但系统环境变量会覆盖
// 合并系统环境变量和本地.env，系统变量优先级更高
const env = {
  ...dotenv.config().parsed,
  ...process.env
}
const { version, name } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'))

// 🌟 修改2：添加端口监听（满足Render要求，防止服务被判定为未启动）
const PORT = process.env.PORT || 3000
import http from 'http'
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WeChat Bot is running!')
})
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`)
})

// 扫码
function onScan(qrcode, status) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    // 在控制台显示二维码
    qrTerminal.generate(qrcode, { small: true })
    const qrcodeImageUrl = ['https://api.qrserver.com/v1/create-qr-code/?data=', encodeURIComponent(qrcode)].join('')
    console.log('onScan:', qrcodeImageUrl, ScanStatus[status], status)
  } else {
    log.info('onScan: %s(%s)', ScanStatus[status], status)
  }
}

// 登录
function onLogin(user) {
  console.log(`${user} has logged in`)
  const date = new Date()
  console.log(`Current time:${date}`)
  console.log(`Automatic robot chat mode has been activated`)
}

// 登出
function onLogout(user) {
  console.log(`${user} has logged out`)
}

// 收到好友请求
async function onFriendShip(friendship) {
  const frienddShipRe = /chatgpt|chat/
  if (friendship.type() === 2) {
    if (frienddShipRe.test(friendship.hello())) {
      await friendship.accept()
    }
  }
}

/**
 * 消息发送
 * @param msg
 * @param isSharding
 * @returns {Promise<void>}
 */
async function onMessage(msg) {
  // 默认消息回复
  await defaultMessage(msg, bot, serviceType)
  // 消息分片
  // await shardingMessage(msg,bot)
}

// 初始化机器人
const CHROME_BIN = process.env.CHROME_BIN ? { endpoint: process.env.CHROME_BIN } : {}
let serviceType = ''
export const bot = WechatyBuilder.build({
  name: 'WechatEveryDay',
  puppet: 'wechaty-puppet-wechat4u', // 如果有token，记得更换对应的puppet
  // puppet: 'wechaty-puppet-wechat', // 如果 wechaty-puppet-wechat 存在问题，也可以尝试使用上面的 wechaty-puppet-wechat4u ，记得安装 wechaty-puppet-wechat4u
  puppetOptions: {
    uos: true,
    ...CHROME_BIN,
  },
})

// 扫码
bot.on('scan', onScan)
// 登录
bot.on('login', onLogin)
// 登出
bot.on('logout', onLogout)
// 收到消息
bot.on('message', onMessage)
// 添加好友
bot.on('friendship', onFriendShip)
// 错误
bot.on('error', (e) => {
  console.error('❌ bot error handle: ', e)
  // console.log('❌ 程序退出,请重新运行程序')
  // bot.stop()

  // // 如果 WechatEveryDay.memory-card.json 文件存在，删除
  // if (fs.existsSync('WechatEveryDay.memory-card.json')) {
  //   fs.unlinkSync('WechatEveryDay.memory-card.json')
  // }
  // process.exit()
})

// 启动微信机器人
function botStart() {
  bot
    .start()
    .then(() => console.log('Start to log in wechat...'))
    .catch((e) => console.error('❌ botStart error: ', e))
}

process.on('uncaughtException', (err) => {
  if (err.code === 'ERR_ASSERTION') {
    console.error('❌ uncaughtException 捕获到断言错误: ', err.message)
  } else {
    console.error('❌ uncaughtException 捕获到未处理的异常: ', err)
  }
  // if (fs.existsSync('WechatEveryDay.memory-card.json')) {
  //   fs.unlinkSync('WechatEveryDay.memory-card.json')
  // }
})

// 🌟 修改3：修复环境变量读取逻辑，优先用系统变量
function handleStart(type) {
  serviceType = type
  console.log('🌸🌸🌸 / type: ', type)
  switch (type) {
    case 'ChatGPT':
      if (process.env.OPENAI_API_KEY) return botStart()
      console.log('❌ 请先配置 OPENAI_API_KEY 环境变量')
      break
    case 'doubao':
      if (process.env.DOUBAO_API_KEY) return botStart()
      console.log('❌ 请先配置 DOUBAO_API_KEY 环境变量')
      break
    case 'deepseek':
      if (process.env.DEEPSEEK_API_KEY) return botStart()
      console.log('❌ 请先配置 DEEPSEEK_API_KEY 环境变量')
      break
    case 'Kimi':
      if (process.env.KIMI_API_KEY) return botStart()
      console.log('❌ 请先配置 KIMI_API_KEY 环境变量')
      break
    case 'Xunfei':
      if (process.env.XUNFEI_APP_ID && process.env.XUNFEI_API_KEY && process.env.XUNFEI_API_SECRET) {
        return botStart()
      }
      console.log('❌ 请先配置 XUNFEI_APP_ID，XUNFEI_API_KEY，XUNFEI_API_SECRET 环境变量')
      break
    case 'deepseek-free':
      if (process.env.DEEPSEEK_FREE_URL && process.env.DEEPSEEK_FREE_TOKEN && process.env.DEEPSEEK_FREE_MODEL) {
        return botStart()
      }
      console.log('❌ 请先配置 DEEPSEEK_FREE_URL，DEEPSEEK_FREE_TOKEN，DEEPSEEK_FREE_MODEL 环境变量')
      break
    case '302AI':
      if (process.env._302AI_API_KEY) {
        return botStart()
      }
      console.log('❌ 请先配置 _302AI_API_KEY 环境变量')
      break
    case 'dify':
      if (process.env.DIFY_API_KEY && process.env.DIFY_URL) {
        return botStart()
      }
      console.log('❌ 请先配置 DIFY_API_KEY 和 DIFY_URL 环境变量')
      break
    case 'ollama':
      if (process.env.OLLAMA_URL && process.env.OLLAMA_MODEL) {
        return botStart()
      }
      break
    case 'tongyi':
      if (process.env.TONGYI_URL && process.env.TONGYI_MODEL) {
        return botStart()
      }
      break
    case 'claude':
      if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_MODEL) {
        return botStart()
      }
      console.log('❌ 请先配置 CLAUDE_API_KEY 和 CLAUDE_MODEL 环境变量')
      break
    default:
      console.log('❌ 服务类型错误, 目前支持： ChatGPT | doubao | deepseek | Kimi | Xunfei | DIFY | OLLAMA | TONGYI')
  }
}

export const serveList = [
  { name: 'ChatGPT', value: 'ChatGPT' },
  { name: 'doubao', value: 'doubao' },
  { name: 'deepseek', value: 'deepseek' },
  { name: 'Kimi', value: 'Kimi' },
  { name: 'Xunfei', value: 'Xunfei' },
  { name: 'deepseek-free', value: 'deepseek-free' },
  { name: '302AI', value: '302AI' },
  { name: 'dify', value: 'dify' },
  // ... 欢迎大家接入更多的服务
  { name: 'ollama', value: 'ollama' },
  { name: 'tongyi', value: 'tongyi' },
  { name: 'claude', value: 'claude' },
]
const questions = [
  {
    type: 'list',
    name: 'serviceType', //存储当前问题回答的变量key，
    message: '请先选择服务类型',
    choices: serveList,
  },
]

// 🌟 修改4：优先读取系统环境变量中的SERVICE_TYPE
function init() {
  const serviceTypeEnv = process.env.SERVICE_TYPE || env.SERVICE_TYPE
  if (serviceTypeEnv) {
    // 判断SERVICE_TYPE是否配置正确
    if (serveList.find((item) => item.value === serviceTypeEnv)) {
      handleStart(serviceTypeEnv)
    } else {
      console.log('❌ 请正确配置 SERVICE_TYPE 环境变量，或者删除该项')
    }
  } else {
    inquirer
      .prompt(questions)
      .then((res) => {
        handleStart(res.serviceType)
      })
      .catch((error) => {
        console.log('❌ inquirer error:', error)
      })
  }
}

const program = new Command(name)
program
  .alias('we')
  .description('🤖一个基于 WeChaty 结合AI服务实现的微信机器人。')
  .version(version, '-v, --version, -V')
  .option('-s, --serve <type>', '跳过交互，直接设置启动的服务类型')
  // .option('-p, --proxy <url>', 'proxy url', '')
  .action(function () {
    const { serve } = this.opts()
    const args = this.args
    if (!serve) return init()
    handleStart(serve)
  })
  .command('start')
  .option('-s, --serve <type>', '跳过交互，直接设置启动的服务类型', '')
  .action(() => init())

// program
//   .command('config')
//   .option('-d, --depth <type>', 'Set the depth of the folder to be traversed', '10')
//   .action(() => {
//     // 打印当前项目的路径，而不是执行该文件时的所在路径
//     console.log('请手动修改下面路径中的 config.json 文件')
//     console.log(path.resolve(__dirname, '../.env'))
//   })
program.parse()

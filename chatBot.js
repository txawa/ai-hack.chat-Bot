'use strict';

var ws;
var gameNumber = null;
var masterTrip = '123456'; // 管理员trip
var nickname = 'bot'; // 默认昵称
var color = '#FFFFFF'; // 默认颜色

// 发送消息到服务器
function send(data) {
    try {
        ws.send(JSON.stringify(data));
    } catch (error) {
        console.error('发送消息失败:', error);
    }
}

// 发送聊天消息
function sendChatMessage(message) {
    send({ cmd: 'chat', text: message });
}

// 发送私信
function sendWhisper(nickname, message) {
    send({ cmd: 'whisper', nick: nickname, text: message });
}

// 显示帮助信息
function helpText() {
    return '可用命令：\n' +
        '- help: 显示此帮助信息\n' +
        '- cat [n]: 发送 "喵" 字符 n 次，n 在 1 到 10 之间\n' +
        '- owo: 掷骰子，得到一个 1 到 6 之间的数字\n' +
        '- game: 开始一个新的猜数字游戏\n' +
        '- guess [number]: 在猜数字游戏中进行猜测\n' +
        '- nick [newNickname]: 更改昵称为 [newNickname]（仅限管理员）\n' +
        '- color [colorCode]: 更改颜色为 [colorCode]（仅限管理员，或使用 "random" 生成随机颜色）\n' +
        '- addadmin [trip]: 添加管理员（仅限管理员）\n' +
        '- removeadmin [trip]: 移除管理员（仅限管理员）\n' +
        '- listadmins: 列出所有管理员（仅限管理员）\n' +
        '- chat "聊天内容": 发送自定义聊天消息（仅限管理员）\n' +
        '- time [timezone]: 查询当前时间，默认时区为 Asia/Shanghai';
}

// 处理"喵"命令
function handleCatCommand(parameter) {
    let count = parseInt(parameter, 10);
    if (isNaN(count) || count < 1 || count > 10) {
        count = Math.floor(Math.random() * 10) + 1;
    }
    return '喵'.repeat(count);
}

// 掷骰子命令
function handleDiceRoll() {
    return Math.floor(Math.random() * 6) + 1;
}

// 开始猜数字游戏
function startNewGame() {
    gameNumber = Math.floor(Math.random() * 100) + 1;
    return '猜数字游戏已开始！请猜一个1到100之间的数字。';
}

// 处理猜数字命令
function handleGuessCommand(parameter) {
    const guess = parseInt(parameter, 10);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        return '请输入一个1到100之间的数字进行猜测。';
    }
    if (guess === gameNumber) {
        return `恭喜你猜对了！数字是${gameNumber}。`;
    } else if (guess < gameNumber) {
        return '太小了，请再试一次。';
    } else {
        return '太大了，请再试一次。';
    }
}

// 更改昵称
function changeNickname(newNickname) {
    sendChatMessage(`/nick ${newNickname}`); // 发送 /nick 命令到服务器
    nickname = newNickname; // 更新本地昵称
    sendChatMessage(`昵称已更改为 ${nickname}`);
}

// 更改颜色
function changeColor(newColor) {
    if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        sendChatMessage(`/color ${newColor}`); // 发送 /color 命令到服务器
        color = newColor; // 更新本地颜色
        sendChatMessage(`颜色已更改为 ${color}`);
    } else {
        sendChatMessage('无效的颜色代码。请使用16进制格式，例如 #RRGGBB。');
    }
}

// 生成随机颜色
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 验证 trip 码
function isValidTrip(trip) {
    return /^[A-Za-z0-9+/]{6}$/.test(trip);
}

// 添加管理员到 masterTrip
function addAdmin(trip) {
    if (isValidTrip(trip) && !masterTrip.split(',').includes(trip)) {
        masterTrip += `,${trip}`;
        sendChatMessage(`管理员 ${trip} 已添加到 masterTrip。`);
    } else {
        sendChatMessage('无效的 trip 码或该用户已是管理员。');
    }
}

// 从 masterTrip 移除管理员
function removeAdmin(trip) {
    if (trip === '48wNI7') {
        sendChatMessage('123456 是超级管理员，无法删除。');
        return;
    }

    const trips = masterTrip.split(',');
    const index = trips.indexOf(trip);
    if (index !== -1) {
        trips.splice(index, 1);
        masterTrip = trips.join(',');
        sendChatMessage(`管理员 ${trip} 已从 masterTrip 移除。`);
    } else {
        sendChatMessage('管理员不存在。');
    }
}

// 列出所有管理员
function listAdmins() {
    const trips = masterTrip.split(',');
    if (trips.length > 0) {
        return `当前管理员：\n${trips.join('\n')}`;
    } else {
        return '没有管理员。';
    }
}

// 执行管理员命令
function executeCommand(command) {
    sendChatMessage(command);
}

// 获取当前时间
function getCurrentTime(timezone) {
    try {
        const date = new Date().toLocaleString('en-US', { timeZone: timezone });
        return `当前时间 (${timezone})：${date}`;
    } catch (e) {
        return '希腊奶~';
    }
}

// 处理 WebSocket 消息
function onMessage(e) {
    try {
        const data = JSON.parse(e.data);
        console.log('Received data:', data); // 调试输出

        if (data.cmd === 'chat' || (data.cmd === 'info' && data.type === 'whisper')) {

            let reply, nick, text;

            if (data.cmd === 'chat') {
                nick = data.nick;
                text = data.text;
                reply = (message) => {
                    sendChatMessage(message);
                };
            } else if (data.cmd === 'info') {
                /**
                 * @type {RegExpMatchArray | null}
                 */
                const match = data.text.match(/^([a-zA-Z0-9_]+) whispered: (.*)$/);
                // 是私信消息
                if (match) {
                    nick = match[1];
                    text = match[2];
                    reply = (message) => {
                        sendWhisper(nick, message);
                    };
                } else {
                    return;
                }
            }

            console.log('Received message:', text); // 调试输出

            if (text.startsWith('-chat ')) {
                // 执行管理员命令
                const execCommand = text.substring(5).trim();
                if (isAdmin(data.trip)) {
                    executeCommand(execCommand);
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text === '-help') {
                reply(helpText());
            } else if (text === '-game') {
                reply(startNewGame());
            } else if (text.startsWith('-guess ')) {
                const guessParameter = text.substring(6).trim();
                reply(handleGuessCommand(guessParameter));
            } else if (text.startsWith('-cat ')) {
                const catParameter = text.substring(4).trim();
                reply(handleCatCommand(catParameter));
            } else if (text === '-owo') {
                reply(`骰子结果: ${handleDiceRoll()}`);
            } else if (text.startsWith('-nick ')) {
                const newNickname = text.substring(5).trim();
                if (isAdmin(data.trip)) {
                    if (/^[a-zA-Z0-9_]+$/.test(newNickname)) {
                        changeNickname(newNickname);
                    } else {
                        reply('昵称只能包含英文字符、数字和下划线。');
                    }
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text.startsWith('-color ')) {
                const colorParameter = text.substring(6).trim();
                if (isAdmin(data.trip)) {
                    if (colorParameter === 'random') {
                        const randomColor = getRandomColor();
                        changeColor(randomColor);
                    } else if (/^#[0-9A-Fa-f]{6}$/.test(colorParameter)) {
                        changeColor(colorParameter);
                    } else {
                        reply('无效的颜色代码。请使用16进制格式，例如 #RRGGBB。');
                    }
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text.startsWith('-addadmin ')) {
                if (isAdmin(data.trip)) {
                    addAdmin(text.substring(9).trim());
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text.startsWith('-removeadmin ')) {
                if (isAdmin(data.trip)) {
                    removeAdmin(text.substring(12).trim());
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text === '-listadmins') {
                if (isAdmin(data.trip)) {
                    reply(listAdmins());
                } else {
                    reply('只有管理员才能使用此命令。');
                }
            } else if (text.startsWith('-time ')) {
                const timezone = text.substring(5).trim() || 'Asia/Shanghai'; // 默认时区为中国标准时间
                reply(getCurrentTime(timezone));
            }
        }
    } catch (error) {
        console.error('处理消息失败:', error);
    }
}

// 验证是否为管理员
function isAdmin(trip) {
    return masterTrip.split(',').includes(trip);
}

// 重新连接到服务器
function reconnect() {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        Run();
    }
}

// 运行WebSocket连接
function Run() {
    ws = new WebSocket("wss://hack.chat/chat-ws");

    ws.onopen = function () {
        console.log("成功连接到服务器！");
        send({ cmd: 'join', nick: nickname, password: 'botpassword', channel: 'loungee' });
    };

    ws.onmessage = onMessage;

    ws.onclose = function () {
        console.log("与服务器断开连接！");
        setTimeout(reconnect, 10000); // 
    };

    ws.onerror = function (error) {
        console.error('WebSocket错误:', error);
        ws.close(); 
    };
}

Run();

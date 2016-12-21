// Require the packages we will use:
var http = require("http"),
    socketio = require("socket.io"),
    fs = require("fs");
var Multimap = require('multimap');
var $ = require('jquery');

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile("client.html", function(err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return resp.writeHead(500);
        resp.writeHead(200);
        resp.end(data);
    });
});
app.listen(3456);

var users = [];
var rooms = [];
var type = {};
var password = {};
var admin = {};
var bannedUsers = new Multimap();

rooms.push('lobby');

// Do the Socket.IO magic:
var io = socketio.listen(app);

io.sockets.on("connection", function(socket) {
    // This callback runs when a new Socket.IO connection is established.

    socket.on("new_user", function(data) {
        socket.leave(socket.room);
        socket.room = 'lobby';
        socket.username = data["username"];
        socket.status = data['status'];
        users.push(data["username"]);
        console.log("File name: " + data['file']);
        socket.join('lobby');
        type[data['room']] = "public";
        console.log("Lobby room time on user create is: " + type[data['room']]);
        io.sockets.in(socket.room).emit("new_user", {
            message: "I am a new user. Nice to meet you!",
            username: data["username"]
        });
        io.sockets.emit("update_rooms", {
            rooms: rooms,
            current_room: 'lobby'
        });
    });

    function addUser() {
        var username = $("#username").val();
        $("#username").val("");
        $("#setUsernameInput").hide();
        $("#makeRoomInput").show();
        socket.username = username;
        socket.room = 'lobby';
        socket.emit("new_user", {
            username: username
        });
    }

    socket.on("new_room", function(data) {
        rooms.push(data["room"]);
        socket.admin = data["room"];
        admin[data['room']] = socket.username
        socket.leave(socket.room);
        socket.room = data["room"];
        socket.join(data['room']);
        type[data['room']] = data["type"];
        if (data["type"] == "private") {
            password[data["room"]] = data["password"];
        }
        io.sockets.in(data["room"]).emit("new_user", {
            message: "I am a new user. I just joined this room to meet you!",
            username: socket.username
        });
        io.sockets.emit("update_rooms", {
            rooms: rooms,
            current_room: socket.room
        });
    });

    socket.on("change_room", function(data) {
        var stopChange = false;
        socket.status = data['status'];
        if (bannedUsers.has(data['room'])) {
            var banned = bannedUsers.get(data['room']);
            console.log(banned);
            for (let curUser of banned) {
                console.log(curUser);
                if (curUser == socket.username) {
                    stopChange = true;
                    socket.emit("cannot_join", {
                        value: true
                    });
                }
            }
        }
        if (type[data['room']] == "private" && !stopChange) {
            socket.emit("password_verify", {
                room: data["room"],
                password: password[data['room']]
            });
        } else if (!stopChange) {
            switchRoom(data);
        }

    });

    socket.on("password_true", function(data) {
        switchRoom(data);
    });

    socket.on("kickout_user", function(data) {
        console.log("User to be kicked out: " + data['user_to_kickout']);
        io.sockets.in(socket.room).emit("check_if_kickout", {
            user_to_kickout: data['user_to_kickout']
        });
    });

    socket.on("ban_user", function(data) {
        console.log("User to be banned: " + data['user_to_ban']);
        bannedUsers = bannedUsers.set(data['room'], data['user_to_ban']);
        console.log(bannedUsers);
        io.sockets.in(socket.room).emit("check_if_banned", {
            user_to_ban: data['user_to_ban'],
            room: data['room']
        });
    });

    socket.on("individual_message", function(data) {
        console.log("User to be messaged: " + data['user_to_message']);
        io.sockets.in(socket.room).emit("check_if_messaged", {
            user_to_message: data['user_to_message'],
            messenger: data['messenger'],
            message: data['message']
        });
    });

    socket.on("server_update_status", function(data) {
        socket.status = data['new_status'];
        io.sockets.emit("update_rooms", {
            rooms: rooms,
            current_room: data['room']
        });
    });

    function switchRoom(data) {
        socket.leave(socket.room);
        socket.join(data['room']);
        socket.room = data['room'];
        io.sockets.emit("update_rooms", {
            rooms: rooms,
            current_room: socket.room
        });
        io.sockets.in(data["room"]).emit("new_user", {
            message: "I am a new user. I just joined this room to meet you!",
            username: socket.username
        });
    }

    socket.on("room_users", function(data) {
        var clients = {};
        var socketId = io.sockets.adapter.rooms[data['room']];
        if (socketId) {
            for (clientId in socketId['sockets']) {
                var the_client = io.sockets.connected[clientId].username;
                var the_status = io.sockets.connected[clientId].status;
                clients[the_client] = the_status;
            }
        }
        socket.emit("emit_clients", clients);

    });

    socket.on('message_to_server', function(data) {
        io.sockets.in(socket.room).emit("message_to_client", {
            message: data["message"],
            username: data["username"]
        }); // broadcast the message to other users
        //add chatroom to emitted json object
    });

});

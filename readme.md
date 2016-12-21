# A simple chatroom.

## I co-created this chatroom with Allen Nikka

## Features

- Customizable user status can be input in the bar with the placeholder "Status..."
- The location of the user is announced when joining a chatroom - implemented with the help of the following API: <http://ip-api.com/docs/api:json>
- There is an automatic 'timeout' function that will perform the following functions after a user has been inactive (hasn't sent a message) within a pre-determined period of time (30 seconds):
  - Announce to other users in the room that the inactive user is inactive and about to me pushed back to the lobby
  - Push the inactive user to the lobby
  - Change the inactive user's status to "away"

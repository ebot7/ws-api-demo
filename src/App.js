import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import io from 'socket.io-client';

// use 'https://main-api.e-bot7.io' for production
// and 'https://api.stable.e-bot7.de' for development
const API_SERVER = 'API ENDPOINT HERE'
const BOT_ID = 'YOUR BOTID HERE'
const API_KEY = 'YOUR APIKEY HERE'

let convId = null;

const socket = io(API_SERVER, {
  path: '/v0/socket.io',
  transports: ['websocket'],
})

// by default, use the WS protocol
// or fall back to long polling, if needed
socket.on('reconnect_attempt', () => {
  socket.io.opts.transports = ['polling', 'websocket']
})

const auth = async addMessageHandler => {
  const { data: { accessToken } } = await axios.post(
    `${API_SERVER}/authentication`,
    {
      strategy: 'visitor-api',
      apiKey: API_KEY,
    },
    {
      headers: { 'content-type': 'application/vnd.api+json' }
    }
  );

  socket.emit(
    'authenticate',
    {
      strategy: 'jwt',
      accessToken
    },
    function(message, data) {
      socket.on('convs created', function(data) {
        convId = data.id
        addMessageHandler({ from: 'system', text: `conv ${convId} created!` })
      })

      socket.on('messages created', function(data) {
        const { body: text, source: from } = data.attributes
        addMessageHandler({ from, text })
      })

      socket.emit('create', 'convs', {
        data: {
          type: 'convs',
          attributes: {
            needsInteraction: false,
            isArchived: false,
            isVisitorBanned: false,
          },
          relationships: {
            bot: {
              data: {
                type: 'bots',
                id: BOT_ID
              }
            }
          }
        }
      });
    }
  );
};

class App extends Component {
  state = {
    messages: [],
    inputValue: ''
  };

  componentDidMount() {
    auth(this.addMessage);
  }

  addMessage = msg => {
    const messages = [...this.state.messages, msg]
    this.setState({ messages })
  };

  sendMessage = () => {
    socket.emit('create', 'messages', {
      data: {
        type: 'messages',
        attributes: {
          body: this.state.inputValue,
          source: 'visitor',
        },
        relationships: {
          conv: {
            data: {
              type: 'convs',
              id: convId
            }
          }
        }
      }
    });

    this.setState({ inputValue: '' });
  };

  handleInputChange = event => {
    this.setState({ inputValue: event.target.value });
  };

  render() {
    return (
      <div className='App'>
        <div className='messages'>
          <div>MESSAGES:</div>
          {this.state.messages.map((msg, idx) => (
            <div key={`msg-${idx}`}>
              - {msg.from}: {msg.text}
            </div>
          ))}
        </div>
        <div className='inputGroup'>
          <input
            type='text'
            placeholder='message...'
            value={this.state.inputValue}
            onChange={this.handleInputChange}
          />
          <button onClick={this.sendMessage} disabled={!this.state.inputValue}>
            SEND
          </button>
        </div>
      </div>
    );
  }
}

export default App;

import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import io from 'socket.io-client';

const BOT_ID = '5b754876c70ca90157c053d2';
const API_KEY = 'visitor'

let convId = null;

const socket = io('https://api.dev.e-bot7.io/', {
  path: '/v0/socket.io'
})

const auth = async addMessageHandler => {
  const { data: { accessToken } } = await axios.post(
    'https://api.dev.e-bot7.io/authentication',
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

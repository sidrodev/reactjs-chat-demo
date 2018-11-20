import moment from 'moment'
import React, { Component } from 'react'
import ReactLoading from 'react-loading'
import 'react-toastify/dist/ReactToastify.css'
import { myFirestore } from '../../Config/MyFirebase'
import images from '../Themes/Images'
import './ChatBoard.css'

export default class ChatBoard extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isLoadHistory: false,
      isShowSticker: false,
      inputValue: ''
    }
    this.currentUserId = localStorage.getItem('id')
    this.currentUserAvatar = localStorage.getItem('photoUrl')
    this.currentUserNickname = localStorage.getItem('nickname')
    this.listMessage = []
    this.currentPeerUser = this.props.currentPeerUser
    this.groupChatId = null
    this.removeListener = null
  }

  componentDidUpdate() {
    this.scrollToBottom()
  }

  componentDidMount() {
    // For first render, it's not go through componentWillReceiveProps
    this.getListHistory()
  }

  componentWillUnmount() {
    if (this.removeListener) {
      this.removeListener()
    }
  }

  componentWillReceiveProps(newProps) {
    if (newProps.currentPeerUser) {
      this.currentPeerUser = newProps.currentPeerUser
      this.getListHistory()
    }
  }

  getListHistory = () => {
    if (this.removeListener) {
      this.removeListener()
    }
    this.listMessage.length = 0
    this.setState({ isLoadHistory: true })
    if (
      this.hashString(this.currentUserId) <=
      this.hashString(this.currentPeerUser.id)
    ) {
      this.groupChatId = `${this.currentUserId}-${this.currentPeerUser.id}`
    } else {
      this.groupChatId = `${this.currentPeerUser.id}-${this.currentUserId}`
    }

    // Get history and listen new data added
    this.removeListener = myFirestore
      .collection('messages')
      .doc(this.groupChatId)
      .collection(this.groupChatId)
      .onSnapshot(
        snapshot => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              this.listMessage.push(change.doc.data())
            }
          })
          this.setState({ isLoadHistory: false })
        },
        err => {
          this.props.showToast(0, err.toString())
        }
      )
  }

  openListSticker = () => {
    this.setState({ isShowSticker: !this.state.isShowSticker })
  }

  onSendMessage = (content, type) => {
    if (this.state.isShowSticker && type === 2) {
      this.setState({ isShowSticker: false })
    }

    if (content.trim() === '') {
      return
    }

    const timestamp = moment()
      .valueOf()
      .toString()

    const itemMessage = {
      idFrom: this.currentUserId,
      idTo: this.currentPeerUser.id,
      timestamp: timestamp,
      content: content.trim(),
      type: type
    }

    myFirestore
      .collection('messages')
      .doc(this.groupChatId)
      .collection(this.groupChatId)
      .doc(timestamp)
      .set(itemMessage)
      .then(() => {
        this.setState({ inputValue: '' })
      })
      .catch(err => {
        this.props.showToast(0, err.toString())
      })
  }

  scrollToBottom = () => {
    if (this.messagesEnd) {
      this.messagesEnd.scrollIntoView({})
    }
  }

  render() {
    return (
      <div className="viewChatBoard">
        {/* Header */}
        <div className="headerChatBoard">
          <img
            className="viewAvatarItem"
            src={this.currentPeerUser.photoUrl}
            alt="icon avatar"
          />
          <span className="textHeaderChatBoard">
            {this.currentPeerUser.nickname}
          </span>
        </div>

        {/* List message */}
        <div className="viewListContentChat">
          {this.renderListMessage()}
          <div
            style={{ float: 'left', clear: 'both' }}
            ref={el => {
              this.messagesEnd = el
            }}
          />
        </div>

        {/* Stickers */}
        {this.state.isShowSticker ? this.renderStickers() : null}

        {/* View bottom */}
        <div className="viewBottom">
          <img
            className="icOpenGallery"
            src={images.ic_photo}
            alt="icon open gallery"
          />
          <img
            className="icOpenSticker"
            src={images.ic_sticker}
            alt="icon open sticker"
            onClick={this.openListSticker}
          />
          <input
            className="viewInput"
            placeholder="Type your message..."
            value={this.state.inputValue}
            onChange={event => {
              this.setState({ inputValue: event.target.value })
            }}
          />
          <img
            className="icSend"
            src={images.ic_send}
            alt="icon send"
            onClick={() => this.onSendMessage(this.state.inputValue, 0)}
          />
        </div>

        {/* Loading */}
        {this.state.isLoadHistory ? (
          <div className="viewLoading">
            <ReactLoading
              type={'spin'}
              color={'#203152'}
              height={'3%'}
              width={'3%'}
            />
          </div>
        ) : null}
      </div>
    )
  }

  renderListMessage = () => {
    if (this.listMessage.length > 0) {
      let viewListMessage = []
      this.listMessage.forEach((item, index) => {
        if (item.idFrom === this.currentUserId) {
          // Item right (my message)
          if (item.type === 0) {
            viewListMessage.push(
              <div className="viewItemRight" key={item.timestamp}>
                <span className="textContentItem">{item.content}</span>
              </div>
            )
          } else if (item.type === 1) {
            viewListMessage.push(
              <div className="viewItemRight2" key={item.timestamp}>
                <img
                  className="imgContentItem"
                  src={item.content}
                  alt="content message"
                />
              </div>
            )
          } else {
            viewListMessage.push(
              <div className="viewItemRight3" key={item.timestamp}>
                <img
                  className="imgContentItem"
                  src={this.getGifImage(item.content)}
                  alt="content message"
                />
              </div>
            )
          }
        } else {
          // Item left (peer message)
          if (item.type === 0) {
            viewListMessage.push(
              <div className="viewWrapItemLeft" key={item.timestamp}>
                <div className="viewWrapItemLeft3">
                  {this.isLastMessageLeft(index) ? (
                    <img
                      src={this.currentPeerUser.photoUrl}
                      alt="avatar"
                      className="peerAvatarLeft"
                    />
                  ) : (
                    <div className="viewPaddingLeft" />
                  )}
                  <div className="viewItemLeft">
                    <span className="textContentItem">{item.content}</span>
                  </div>
                </div>
                {this.isLastMessageLeft(index) ? (
                  <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                ) : null}
              </div>
            )
          } else if (item.type === 1) {
            viewListMessage.push(
              <div className="viewWrapItemLeft2" key={item.timestamp}>
                <div className="viewWrapItemLeft3">
                  {this.isLastMessageLeft(index) ? (
                    <img
                      src={this.currentPeerUser.photoUrl}
                      alt="avatar"
                      className="peerAvatarLeft"
                    />
                  ) : (
                    <div className="viewPaddingLeft" />
                  )}
                  <div className="viewItemLeft2">
                    <img
                      className="imgContentItem"
                      src={item.content}
                      alt="content message"
                    />
                  </div>
                </div>
                {this.isLastMessageLeft(index) ? (
                  <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                ) : null}
              </div>
            )
          } else {
            viewListMessage.push(
              <div className="viewWrapItemLeft2" key={item.timestamp}>
                <div className="viewWrapItemLeft3">
                  {this.isLastMessageLeft(index) ? (
                    <img
                      src={this.currentPeerUser.photoUrl}
                      alt="avatar"
                      className="peerAvatarLeft"
                    />
                  ) : (
                    <div className="viewPaddingLeft" />
                  )}
                  <div className="viewItemLeft3" key={item.timestamp}>
                    <img
                      className="imgContentItem"
                      src={this.getGifImage(item.content)}
                      alt="content message"
                    />
                  </div>
                </div>
                {this.isLastMessageLeft(index) ? (
                  <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                ) : null}
              </div>
            )
          }
        }
      })
      return viewListMessage
    } else {
      return null
    }
  }

  renderStickers = () => {
    return (
      <div className="viewStickers">
        <img
          className="imgSticker"
          src={images.mimi1}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi1', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi2}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi2', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi3}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi3', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi4}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi4', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi5}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi5', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi6}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi6', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi7}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi7', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi8}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi8', 2)}
        />
        <img
          className="imgSticker"
          src={images.mimi9}
          alt="sticker"
          onClick={() => this.onSendMessage('mimi9', 2)}
        />
      </div>
    )
  }

  hashString = str => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash += Math.pow(str.charCodeAt(i) * 31, str.length - i)
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }

  getGifImage = value => {
    switch (value) {
      case 'mimi1':
        return images.mimi1
      case 'mimi2':
        return images.mimi2
      case 'mimi3':
        return images.mimi3
      case 'mimi4':
        return images.mimi4
      case 'mimi5':
        return images.mimi5
      case 'mimi6':
        return images.mimi6
      case 'mimi7':
        return images.mimi7
      case 'mimi8':
        return images.mimi8
      case 'mimi9':
        return images.mimi9
      default:
        return null
    }
  }

  isLastMessageLeft(index) {
    if (
      (index + 1 < this.listMessage.length &&
        this.listMessage[index + 1].idFrom === this.currentUserId) ||
      index === this.listMessage.length - 1
    ) {
      return true
    } else {
      return false
    }
  }

  isLastMessageRight(index) {
    if (
      (index + 1 < this.listMessage.length &&
        this.listMessage[index + 1].idFrom !== this.currentUserId) ||
      index === this.listMessage.length - 1
    ) {
      return true
    } else {
      return false
    }
  }
}
import React, { useState } from 'react'

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

function MessageItem({ message, isGrouped = false, showAvatar = true, showTimestamp = false, isLastInChannel = false, isCurrentUser = false, currentUserId = null, onReply = null }) {
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState(message.reactions || [])
  const [hoveredReaction, setHoveredReaction] = useState(null)

  const user = message.user || { name: 'Unknown', avatar_url: null }
  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const renderContentWithMentions = (content) => {
    if (!content) return null
    
    const mentionRegex = /@(\w+)/g
    const parts = content.split(mentionRegex)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
            @{part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={`flex items-start gap-3 group ${isGrouped ? 'my-1' : 'my-4'} ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      {showAvatar && (
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{user.name?.[0]?.toUpperCase() || 'U'}</span>
          )}
        </div>
      )}
      {!showAvatar && <div className="w-10 flex-shrink-0" />}
      <div className={`flex flex-col gap-1 max-w-[70%] min-w-0 flex-1 ${isCurrentUser ? 'items-end' : ''}`}>
        {showTimestamp && (
          <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'self-end' : ''}`}>
            {!isCurrentUser && <span className="font-bold text-sm truncate">{user.name}</span>}
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatTime(message.created_at)}
              {message.edited_at && (
                <span className="ml-1 italic text-gray-300">(edited)</span>
              )}
            </span>
          </div>
        )}
        
        <div className={`p-3 rounded-lg relative break-words overflow-wrap-anywhere ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {renderContentWithMentions(message.content)}
            </p>
          )}
          
          {message.type === 'image' && message.file_url && (
            <img 
              src={message.file_url} 
              alt={message.file_name || 'Attached image'} 
              className="mt-2 rounded-lg max-w-full cursor-pointer" 
              onClick={() => window.open(message.file_url, '_blank')} 
            />
          )}
          
          {message.type === 'file' && message.file_url && (
            <a 
              href={message.file_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`flex items-center gap-2 mt-2 p-2 rounded-md ${isCurrentUser ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              <span className="text-sm font-medium truncate">{message.file_name}</span>
            </a>
          )}

          {/* Message Actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1 bg-black bg-opacity-20 rounded-lg p-1">
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  title="Reply"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.488.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.492 3.337-1.313.379-.38.708-.796.924-1.22a4.801 4.801 0 001.923-1.22 4.705 4.705 0 00.334-1.785c0-.6-.154-1.194-.432-1.641A8.98 8.98 0 0012 20.25z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                title="Add reaction"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Reactions - Slack style inline */}
        {(reactions.length > 0 || showReactions) && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {reactions.map((reaction, idx) => {
              const userReacted = reaction.users?.some(u => u?.id === currentUserId)
              return (
                <button
                  key={idx}
                  onClick={() => {
                    // Toggle reaction - simplified for now
                    setShowReactions(false)
                  }}
                  onMouseEnter={() => setHoveredReaction(reaction)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                    userReacted 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-gray-600">{reaction.count}</span>
                  {hoveredReaction === reaction && reaction.users && reaction.users.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {reaction.users.map(u => u?.name || 'Unknown').join(', ')}
                    </div>
                  )}
                </button>
              )
            })}
            
            {showReactions && (
              <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-2 shadow-lg z-10">
                {EMOJI_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      // Add reaction - simplified for now
                      setShowReactions(false)
                    }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Read Receipts - Only for current user's messages and only on the very last message in the channel */}
        {isCurrentUser && isLastInChannel && (
          <div className="flex items-center gap-1 mt-1">
            {message.isRead ? (
              <span className="text-blue-500 text-xs" title="Read">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            ) : (
              <span className="text-gray-400 text-xs" title="Sent">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageItem


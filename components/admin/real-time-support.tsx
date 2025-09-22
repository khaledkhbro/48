"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send, Clock, CheckCircle, Phone, Video, Paperclip, Smile } from "lucide-react"
import { getAvailableAgents, assignAgentToSession } from "@/lib/auth"
import type { User as AuthUser } from "@/lib/auth"

interface ChatSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  agentId?: string
  agentName?: string
  status: "waiting" | "active" | "resolved"
  priority: "low" | "medium" | "high"
  subject: string
  messages: ChatMessage[]
  createdAt: string
  lastActivity: string
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderType: "user" | "agent" | "system"
  content: string
  timestamp: string
  type: "text" | "image" | "file" | "system"
}

export function RealTimeSupportSystem() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [availableAgents, setAvailableAgents] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadChatSessions()
    loadAvailableAgents()

    // Simulate real-time updates
    const interval = setInterval(() => {
      loadChatSessions()
      loadAvailableAgents()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadChatSessions = () => {
    // Mock chat sessions - in real app, this would come from your database
    const mockSessions: ChatSession[] = [
      {
        id: "chat-001",
        userId: "user-001",
        userName: "John Smith",
        userEmail: "john@example.com",
        agentId: "02",
        agentName: "Sarah Agent",
        status: "active",
        priority: "high",
        subject: "Payment Issue",
        messages: [
          {
            id: "msg-001",
            senderId: "user-001",
            senderName: "John Smith",
            senderType: "user",
            content: "Hi, I'm having trouble with my payment. It was declined but I was still charged.",
            timestamp: new Date(Date.now() - 300000).toISOString(),
            type: "text",
          },
          {
            id: "msg-002",
            senderId: "02",
            senderName: "Sarah Agent",
            senderType: "agent",
            content: "I understand your concern. Let me check your payment history right away.",
            timestamp: new Date(Date.now() - 240000).toISOString(),
            type: "text",
          },
        ],
        createdAt: new Date(Date.now() - 600000).toISOString(),
        lastActivity: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: "chat-002",
        userId: "user-002",
        userName: "Emma Wilson",
        userEmail: "emma@example.com",
        status: "waiting",
        priority: "medium",
        subject: "Account Verification",
        messages: [
          {
            id: "msg-003",
            senderId: "user-002",
            senderName: "Emma Wilson",
            senderType: "user",
            content: "I uploaded my documents for verification 3 days ago but haven't heard back yet.",
            timestamp: new Date(Date.now() - 120000).toISOString(),
            type: "text",
          },
        ],
        createdAt: new Date(Date.now() - 180000).toISOString(),
        lastActivity: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: "chat-003",
        userId: "user-003",
        userName: "Mike Johnson",
        userEmail: "mike@example.com",
        agentId: "03",
        agentName: "Mike Support",
        status: "active",
        priority: "low",
        subject: "General Question",
        messages: [
          {
            id: "msg-004",
            senderId: "user-003",
            senderName: "Mike Johnson",
            senderType: "user",
            content: "How do I change my profile picture?",
            timestamp: new Date(Date.now() - 60000).toISOString(),
            type: "text",
          },
        ],
        createdAt: new Date(Date.now() - 90000).toISOString(),
        lastActivity: new Date(Date.now() - 60000).toISOString(),
      },
    ]

    setChatSessions(mockSessions)
    setIsLoading(false)
  }

  const loadAvailableAgents = () => {
    const agents = getAvailableAgents()
    setAvailableAgents(agents)
  }

  const handleAssignAgent = (chatId: string) => {
    const agent = assignAgentToSession(chatId)
    if (agent) {
      setChatSessions((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                agentId: agent.id,
                agentName: `${agent.firstName} ${agent.lastName}`,
                status: "active" as const,
              }
            : chat,
        ),
      )
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: "admin",
      senderName: "Admin",
      senderType: "agent",
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: "text",
    }

    setChatSessions((prev) =>
      prev.map((chat) =>
        chat.id === selectedChat.id
          ? { ...chat, messages: [...chat.messages, message], lastActivity: new Date().toISOString() }
          : chat,
      ),
    )

    setSelectedChat((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : null))
    setNewMessage("")
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case "waiting":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Waiting
          </Badge>
        )
      case "resolved":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        )
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const stats = {
    active: chatSessions.filter((c) => c.status === "active").length,
    waiting: chatSessions.filter((c) => c.status === "waiting").length,
    resolved: chatSessions.filter((c) => c.status === "resolved").length,
    availableAgents: availableAgents.length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Waiting</p>
                <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 text-emerald-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Available Agents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Support Chats
            </CardTitle>
            <CardDescription>Active and waiting support conversations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No active chats</div>
              ) : (
                chatSessions.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedChat?.id === chat.id ? "bg-blue-50 border-blue-200" : ""
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {chat.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{chat.userName}</p>
                          <p className="text-xs text-gray-500 truncate">{chat.subject}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(chat.status)}
                            {getPriorityBadge(chat.priority)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">{new Date(chat.lastActivity).toLocaleTimeString()}</div>
                    </div>
                    {chat.status === "waiting" && (
                      <Button
                        size="sm"
                        className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAssignAgent(chat.id)
                        }}
                      >
                        Assign Agent
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-2">
          {selectedChat ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {selectedChat.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedChat.userName}</CardTitle>
                      <CardDescription>{selectedChat.subject}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                    {getStatusBadge(selectedChat.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === "agent" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === "agent"
                            ? "bg-emerald-600 text-white"
                            : message.senderType === "system"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">{new Date(message.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} className="bg-emerald-600 hover:bg-emerald-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a chat to start messaging</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}

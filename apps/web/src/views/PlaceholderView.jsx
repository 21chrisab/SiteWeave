import React from 'react'

export default function PlaceholderView({ title, description }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
    </div>
  )
}

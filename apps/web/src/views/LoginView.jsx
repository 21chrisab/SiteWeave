import React from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

/**
 * Same screen as desktop: shared LoginForm (headline, org subtitle, divider, OAuth icons).
 */
export default function LoginView() {
  const navigate = useNavigate()
  return (
    <LoginForm onPasswordSignInSuccess={() => navigate('/', { replace: true })} />
  )
}

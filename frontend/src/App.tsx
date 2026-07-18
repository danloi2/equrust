import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AlgebraTutor from './components/AlgebraTutor'
import 'katex/dist/katex.min.css'
import './index.css'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AlgebraTutor />
    </QueryClientProvider>
  )
}

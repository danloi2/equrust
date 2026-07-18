import { useMutation } from '@tanstack/react-query'
import { solveExpression } from '../services/api'

export function useSolve() {
  return useMutation({
    mutationFn: (expression: string) => solveExpression(expression),
  })
}

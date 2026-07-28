export type NodeType =
	| 'Number'
	| 'Variable'
	| 'Add'
	| 'Multiply'
	| 'Divide'
	| 'Power'
	| 'Equation'
	| 'Parenthesis'
	| 'Sqrt';


export interface BaseNode {
	readonly type: NodeType;
}

export interface NumberNode extends BaseNode {
	readonly type: 'Number';
	readonly value: number;
}

export interface VariableNode extends BaseNode {
	readonly type: 'Variable';
	readonly name: string;
}

export interface AddNode extends BaseNode {
	readonly type: 'Add';
	readonly left: Expr;
	readonly right: Expr;
}

export interface MultiplyNode extends BaseNode {
	readonly type: 'Multiply';
	readonly left: Expr;
	readonly right: Expr;
}

export interface DivideNode extends BaseNode {
	readonly type: 'Divide';
	readonly left: Expr;
	readonly right: Expr;
}

export interface PowerNode extends BaseNode {
	readonly type: 'Power';
	readonly base: Expr;
	readonly exponent: Expr;
}

export interface EquationNode extends BaseNode {
	readonly type: 'Equation';
	readonly left: Expr;
	readonly right: Expr;
}

export interface ParenthesisNode extends BaseNode {
	readonly type: 'Parenthesis';
	readonly inner: Expr;
}

export interface SqrtNode extends BaseNode {
	readonly type: 'Sqrt';
	readonly inner: Expr;
}

export type Expr =
	| NumberNode
	| VariableNode
	| AddNode
	| MultiplyNode
	| DivideNode
	| PowerNode
	| EquationNode
	| ParenthesisNode
	| SqrtNode;

export interface ExplanationBlock {
	readonly type: 'text' | 'math';
	readonly content: string;
}

export interface RuleResult {
	readonly before: Expr;
	readonly after: Expr;
	readonly title: string;
	readonly explanation: string;
	readonly explanationBlocks?: readonly ExplanationBlock[];
	readonly concept: string;
	readonly difficulty: number;
	/** Soluciones reales de la ecuación: 2, 1 o 0 valores */
	readonly solutions?: readonly [] | readonly [number] | readonly [number, number];
	/** Representaciones en LaTeX de las soluciones (por ejemplo para mostrar fracciones exactas) */
	readonly solutionsLatex?: readonly string[];
	/** Si true, el solver no debe aplicar más reglas después de este paso */
	readonly terminal?: boolean;
}

export interface Rule {
	readonly name: string;
	applies(expr: Expr): boolean;
	apply(expr: Expr): RuleResult;
}

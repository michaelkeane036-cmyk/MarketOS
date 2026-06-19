import type { CustomerDraft, ProductDraft, ReviewEntryDraft, ValidationIssue, ValidationResult } from '../types'
import { parseMoney, parseQuantity } from './format'

export function validateReviewEntry(entry: ReviewEntryDraft): ValidationResult {
  const issues: ValidationIssue[] = []
  const quantity = parseQuantity(entry.quantity)
  const amount = parseMoney(entry.amount)
  const unitPrice = parseMoney(entry.unitPrice)
  const paidAmount = parseMoney(entry.paidAmount)
  const computedSaleTotal = amount || quantity * unitPrice

  if (!entry.summary.trim()) addIssue(issues, 'summary', 'Add a short summary before saving.')

  if (entry.type === 'sale') {
    if (!entry.itemName.trim()) addIssue(issues, 'itemName', 'Enter the item sold.')
    if (quantity <= 0) addIssue(issues, 'quantity', 'Quantity must be greater than zero.')
    if (computedSaleTotal <= 0) addIssue(issues, 'amount', 'Sale amount must be greater than zero.')
    if (paidAmount < 0) addIssue(issues, 'paidAmount', 'Paid amount cannot be negative.')
    if (paidAmount > computedSaleTotal) addIssue(issues, 'paidAmount', 'Paid amount cannot be greater than the sale total.')
  }

  if (entry.type === 'expense') {
    if (!entry.itemName.trim()) addIssue(issues, 'itemName', 'Enter what the expense was for.')
    if (amount <= 0) addIssue(issues, 'amount', 'Expense amount must be greater than zero.')
  }

  if (entry.type === 'stock') {
    if (!entry.itemName.trim()) addIssue(issues, 'itemName', 'Enter the product name.')
    if (quantity <= 0) addIssue(issues, 'quantity', 'Stock quantity must be greater than zero.')
    if (parseMoney(entry.unitCost) < 0) addIssue(issues, 'unitCost', 'Unit cost cannot be negative.')
  }

  if (entry.type === 'debt') {
    if (!entry.customerName.trim() || entry.customerName.trim().toLowerCase() === 'walk-in customer') {
      addIssue(issues, 'customerName', 'Choose or enter the customer who owes.')
    }
    if (amount <= 0) addIssue(issues, 'amount', 'Debt amount must be greater than zero.')
    if (paidAmount < 0) addIssue(issues, 'paidAmount', 'Paid amount cannot be negative.')
    if (paidAmount > amount) addIssue(issues, 'paidAmount', 'Paid amount cannot be greater than the debt amount.')
  }

  return toResult(issues)
}

export function validateProductDraft(draft: ProductDraft): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!draft.name.trim()) addIssue(issues, 'name', 'Product name is required.')
  if (parseMoney(draft.stock) < 0) addIssue(issues, 'stock', 'Stock cannot be negative.')
  if (parseMoney(draft.reorderPoint) < 0) addIssue(issues, 'reorderPoint', 'Reorder point cannot be negative.')
  if (parseMoney(draft.unitCost) < 0) addIssue(issues, 'unitCost', 'Unit cost cannot be negative.')
  if (parseMoney(draft.sellingPrice) < 0) addIssue(issues, 'sellingPrice', 'Selling price cannot be negative.')
  if (!draft.unit.trim()) addIssue(issues, 'unit', 'Unit is required.')

  return toResult(issues)
}

export function validateCustomerDraft(draft: CustomerDraft): ValidationResult {
  const issues: ValidationIssue[] = []
  if (!draft.name.trim()) addIssue(issues, 'name', 'Customer name is required.')
  return toResult(issues)
}

export function issueMessages(result: ValidationResult) {
  return result.issues.map((issue) => issue.message)
}

function addIssue(issues: ValidationIssue[], field: string, message: string) {
  issues.push({ field, message })
}

function toResult(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: issues.length === 0,
    issues
  }
}

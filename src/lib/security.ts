// Security utilities for input validation and sanitization

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Remove potentially dangerous characters
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateAmount = (amount: string): { isValid: boolean; error?: string } => {
  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (numericAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (numericAmount > 10000000) { // 1 crore limit
    return { isValid: false, error: 'Amount cannot exceed ₹1,00,00,000' };
  }
  
  // Check for reasonable decimal places
  const decimalParts = amount.split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
  }
  
  return { isValid: true };
};

export const validateDate = (date: string): { isValid: boolean; error?: string } => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const selectedDate = new Date(date);
  const today = new Date();
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(today.getFullYear() - 100);
  
  if (selectedDate > today) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  
  if (selectedDate < hundredYearsAgo) {
    return { isValid: false, error: 'Date cannot be more than 100 years ago' };
  }
  
  return { isValid: true };
};

export const validateTextInput = (
  input: string, 
  fieldName: string, 
  minLength: number = 1, 
  maxLength: number = 255
): { isValid: boolean; error?: string } => {
  if (!input || input.trim().length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} character(s) long` };
  }
  
  if (input.length > maxLength) {
    return { isValid: false, error: `${fieldName} cannot exceed ${maxLength} characters` };
  }
  
  // Check for potentially malicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { isValid: false, error: `${fieldName} contains invalid characters` };
    }
  }
  
  return { isValid: true };
};

export const rateLimitKey = (userId: string, action: string): string => {
  return `rate_limit_${userId}_${action}`;
};

export const checkRateLimit = (key: string, maxAttempts: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(key) || '[]') as number[];
  
  // Remove attempts outside the time window
  const recentAttempts = attempts.filter(attempt => now - attempt < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  // Add current attempt
  recentAttempts.push(now);
  localStorage.setItem(key, JSON.stringify(recentAttempts));
  
  return true; // Within rate limit
};
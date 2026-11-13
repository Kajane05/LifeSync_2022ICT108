// Validate task title
export const validateTaskTitle = (title) => {
    return title.trim().length >= 3;
};
// Validate task description
export const validateDescription = (description) => {
    return description.trim().length <= 500;
};
// Validate 4-digit PIN
export const validatePIN = (pin) => {
    return /^\d{4}$/.test(pin);
};
// Validate required fields
export const validateRequiredField = (value) => {
    return value.trim().length > 0;
};
// Validate PIN confirmation
export const validatePINConfirmation = (pin, confirmPin) => {
    return pin === confirmPin && validatePIN(pin);
};

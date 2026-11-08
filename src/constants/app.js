export const BLUE = '#2563EB';
export const cats = ['Personal', 'Work', 'Education', 'Business', 'Health', 'Other'];
export const today = () => new Date().toISOString().slice(0, 10);
export const plusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
};

// Format date into a readable format
export const formatDate = (date) => {
    const dateObject = new Date(date);
    return dateObject.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};
// Get today's date
export const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
};
// Check whether a task is overdue
export const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "Completed") {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dueDate);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
};
// Calculate remaining days
export const getRemainingDays = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dueDate);
    deadline.setHours(0, 0, 0, 0);
    const difference = deadline.getTime() - today.getTime();
    return Math.ceil(difference / (1000 * 60 * 60 * 24));
};
// Check whether a date is today
export const isToday = (date) => {
    return date === getTodayDate();
};

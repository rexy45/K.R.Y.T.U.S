export function getGreeting(name: string): string {

    const hour = new Date().getHours();

    if (hour < 12)
        return `Good morning, ${name}.`;

    if (hour < 17)
        return `Good afternoon, ${name}.`;

    if (hour < 21)
        return `Good evening, ${name}.`;

    return `Working late again, ${name}?`;

}

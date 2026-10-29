/**
 * Utility for sanitizing and escaping values for CSV exports.
 * Protects against CSV / Spreadsheet Formula Injection (CWE-1236)
 * by prepending a single quote to cells beginning with dangerous characters: =, +, -, @, \t, \r
 */
export function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '""'
    let str = String(value)
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`
    }
    return `"${str.replace(/"/g, '""')}"`
}

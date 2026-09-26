// Keep the original theme IDs so existing saved preferences remain valid.
export const colorThemes = [
    { value: 'pink', label: 'shao-nv-fen', accent: '#FF69B4', ink: '#ad286b', night: '#ff9dcb', background: '#FFF0F5' },
    { value: 'blue', label: 'nan-nan-lan', accent: '#4A90E2', ink: '#2467ae', night: '#8bbfff', background: '#E8F4FA' },
    { value: 'green', label: 'tou-ding-lv', accent: '#34C759', ink: '#237a40', night: '#81dca0', background: '#E5F9F0' },
    { value: 'orange', label: 'mi-gan-cheng', accent: '#ff6b6b', ink: '#b73c3c', night: '#ffa5a0', background: '#FFF0F5' },
    { value: 'lavender', label: 'theme-lavender', accent: '#8265c7', ink: '#6844ac', night: '#c4adf4', background: '#f3effb' },
    { value: 'teal', label: 'theme-teal', accent: '#25877e', ink: '#196e67', night: '#7ad6c9', background: '#eaf5f2' },
    { value: 'amber', label: 'theme-amber', accent: '#b77824', ink: '#8d5917', night: '#edc078', background: '#faf3e6' },
    { value: 'slate', label: 'theme-slate', accent: '#62748c', ink: '#485b72', night: '#b6c9e0', background: '#eef2f6' }
];

export const getColorTheme = (value) => colorThemes.find(theme => theme.value === value) || colorThemes[0];

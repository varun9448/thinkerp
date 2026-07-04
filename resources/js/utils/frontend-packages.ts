const disabledFrontendPackages = new Set(['Pos']);

export const isPackageFrontendDisabled = (packageName?: string): boolean => {
    return Boolean(packageName && disabledFrontendPackages.has(packageName));
};

export const filterFrontendPackages = (packageNames: string[]): string[] => {
    return packageNames.filter((packageName) => !isPackageFrontendDisabled(packageName));
};

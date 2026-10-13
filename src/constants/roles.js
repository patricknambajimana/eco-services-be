const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    GENERAL_MANAGER: 'GENERAL_MANAGER',
    ACCOUNTANT: 'ACCOUNTANT',

    RESTAURANT_STOCK_MANAGER: 'RESTAURANT_STOCK_MANAGER',
    RESTAURANT_CHEF_LEADER: 'RESTAURANT_CHEF_LEADER',
    RESTAURANT_CHEF: 'RESTAURANT_CHEF',
    RESTAURANT_WAITER_LEADER: 'RESTAURANT_WAITER_LEADER',
    RESTAURANT_WAITER: 'RESTAURANT_WAITER',
    RESTAURANT_CASHIER: 'RESTAURANT_CASHIER',
    RESTAURANT_BARISTA: 'RESTAURANT_BARISTA',

    BAKERY_MANAGER: 'BAKERY_MANAGER',
    BAKERY_STOCK_MANAGER: 'BAKERY_STOCK_MANAGER',
    BAKERY_CASHIER: 'BAKERY_CASHIER',
    BAKERY_CHEF_LEADER: 'BAKERY_CHEF_LEADER',
    BAKERY_CHEF: 'BAKERY_CHEF',
    BAKERY_BARISTA: 'BAKERY_BARISTA',

    DECORATION_MANAGER: 'DECORATION_MANAGER',
    DECORATION_CASHIER: 'DECORATION_CASHIER',
    DECORATION_STAFF: 'DECORATION_STAFF',
};

const ROLE_DESCRIPTIONS = {
    SUPER_ADMIN: 'Complete control over the entire system',
    GENERAL_MANAGER: 'Oversees all departments and consolidated reports',
    ACCOUNTANT: 'Financial reporting, tax calculations, and payroll',
    RESTAURANT_STOCK_MANAGER: 'Manages restaurant ingredients inventory',
    RESTAURANT_CHEF_LEADER: 'Manages kitchen team, recipes and schedules',
    RESTAURANT_CHEF: 'Prepares food and completes kitchen tasks',
    RESTAURANT_WAITER_LEADER: 'Manages waiters, tables and complaints',
    RESTAURANT_WAITER: 'Takes orders, serves meals and manages tables',
    RESTAURANT_CASHIER: 'Processes payments, refunds and cash drawer',
    RESTAURANT_BARISTA: 'Prepares coffee and beverage orders',
    BAKERY_MANAGER: 'Manages bakery operations and production schedules',
    BAKERY_STOCK_MANAGER: 'Manages bakery ingredients and inventory',
    BAKERY_CASHIER: 'Handles bakery sales and payments',
    BAKERY_CHEF_LEADER: 'Manages bakery production teams and recipes',
    BAKERY_CHEF: 'Prepares bakery products',
    BAKERY_BARISTA: 'Prepares coffee and beverages in the bakery',
    DECORATION_MANAGER: 'Manages decoration inventory, showroom and pricing',
    DECORATION_CASHIER: 'Handles decoration sales and payments',
    DECORATION_STAFF: 'Supports showroom activities and customer services',
};

/** Roles that can see / act across ALL departments. */
const GLOBAL_ROLES = [ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER, ROLES.ACCOUNTANT];

/** Reusable role groups for route protection. */
const GROUPS = {
    ADMINS: [ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER],
    MANAGERS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.BAKERY_MANAGER,
        ROLES.DECORATION_MANAGER,
    ],
    FINANCE: [ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER, ROLES.ACCOUNTANT],
    STOCK: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.RESTAURANT_STOCK_MANAGER,
        ROLES.BAKERY_STOCK_MANAGER,
        ROLES.BAKERY_MANAGER,
        ROLES.DECORATION_MANAGER,
    ],
    ORDER_CREATORS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.RESTAURANT_WAITER,
        ROLES.RESTAURANT_WAITER_LEADER,
        ROLES.RESTAURANT_CASHIER,
        ROLES.RESTAURANT_BARISTA,
        ROLES.BAKERY_CASHIER,
        ROLES.DECORATION_CASHIER,
    ],
    CASHIERS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.RESTAURANT_CASHIER,
        ROLES.RESTAURANT_WAITER,
        ROLES.BAKERY_CASHIER,
        ROLES.DECORATION_CASHIER,
    ],
    PRODUCTION: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.BAKERY_MANAGER,
        ROLES.BAKERY_CHEF_LEADER,
        ROLES.BAKERY_CHEF,
        ROLES.RESTAURANT_CHEF_LEADER,
    ],
    RECIPE_EDITORS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.BAKERY_MANAGER,
        ROLES.BAKERY_CHEF_LEADER,
        ROLES.RESTAURANT_CHEF_LEADER,
    ],
    PRODUCT_EDITORS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.BAKERY_MANAGER,
        ROLES.BAKERY_CHEF_LEADER,
        ROLES.DECORATION_MANAGER,
        ROLES.RESTAURANT_CHEF_LEADER,
    ],
    TABLE_MANAGERS: [
        ROLES.SUPER_ADMIN,
        ROLES.GENERAL_MANAGER,
        ROLES.RESTAURANT_WAITER_LEADER,
        ROLES.RESTAURANT_WAITER,
    ],
};

module.exports = { ROLES, ROLE_DESCRIPTIONS, GLOBAL_ROLES, GROUPS };
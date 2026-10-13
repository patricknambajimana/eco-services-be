
CREATE TABLE IF NOT EXISTS departments (
    department_id   SERIAL PRIMARY KEY,
    department_name VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    role_id     SERIAL PRIMARY KEY,
    role_name   VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    phone         VARCHAR(50),
    department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
    status        VARCHAR(30) CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','ON_LEAVE')) DEFAULT 'ACTIVE',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credentials (
    credential_id SERIAL PRIMARY KEY,
    user_id       INT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_code      VARCHAR(255),
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    TIMESTAMP
);
-- For databases created from the original script (pin_code VARCHAR(10)):
ALTER TABLE credentials ALTER COLUMN pin_code TYPE VARCHAR(255);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS staff_schedules (
    schedule_id SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(user_id) ON DELETE CASCADE,
    shift_date  DATE NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    status      VARCHAR(30) DEFAULT 'SCHEDULED'
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id       SERIAL PRIMARY KEY,
    supplier_name     VARCHAR(150) NOT NULL,
    contact_info      TEXT,
    products_supplied TEXT,
    payment_status    VARCHAR(50) DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS inventory_items (
    item_id         SERIAL PRIMARY KEY,
    department_id   INT REFERENCES departments(department_id) ON DELETE CASCADE,
    product_name    VARCHAR(150) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(10,2) DEFAULT 5.00,
    unit            VARCHAR(20) DEFAULT 'pcs',
    expiry_date     DATE,
    status          VARCHAR(30) CHECK (status IN ('AVAILABLE','LOW STOCK','CRITICAL','OUT OF STOCK','EXPIRED')) DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id   SERIAL PRIMARY KEY,
    item_id       INT REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    department_id INT REFERENCES departments(department_id) ON DELETE CASCADE,
    quantity      NUMERIC(10,2) NOT NULL,
    movement_type VARCHAR(50) CHECK (movement_type IN ('PURCHASE','TRANSFER_IN','TRANSFER_OUT','PRODUCTION_USAGE','SOLD','WASTED')) NOT NULL,
    performed_by  INT REFERENCES users(user_id),
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_requisitions (
    requisition_id SERIAL PRIMARY KEY,
    department_id  INT REFERENCES departments(department_id) ON DELETE CASCADE,
    item_id        INT REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    quantity       NUMERIC(10,2) NOT NULL,
    priority       VARCHAR(20) DEFAULT 'NORMAL',
    reason         TEXT,
    required_date  DATE,
    status         VARCHAR(30) CHECK (status IN ('PENDING','APPROVED','REJECTED','FULFILLED')) DEFAULT 'PENDING',
    requested_by   INT REFERENCES users(user_id),
    approved_by    INT REFERENCES users(user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id       SERIAL PRIMARY KEY,
    department_id    INT REFERENCES departments(department_id) ON DELETE CASCADE,
    product_name     VARCHAR(150) NOT NULL,
    category         VARCHAR(100),
    selling_price    NUMERIC(12,2) NOT NULL,
    cost_price       NUMERIC(12,2),
    preparation_time INT,
    shelf_life       INT,
    is_available     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS recipes (
    recipe_id          SERIAL PRIMARY KEY,
    product_id         INT REFERENCES products(product_id) ON DELETE CASCADE,
    recipe_name        VARCHAR(150) NOT NULL,
    preparation_steps  TEXT,
    cooking_time       INT,
    required_equipment VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id         INT REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    item_id           INT REFERENCES inventory_items(item_id) ON DELETE CASCADE,
    quantity_required NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, item_id)
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
    table_id     SERIAL PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    capacity     INT NOT NULL,
    status       VARCHAR(30) CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','CLEANING')) DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS production_batches (
    batch_id            SERIAL PRIMARY KEY,
    product_id          INT REFERENCES products(product_id) ON DELETE CASCADE,
    production_quantity INT NOT NULL,
    production_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_time         TIMESTAMP,
    status              VARCHAR(30) CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','EXPIRED')) DEFAULT 'PLANNED',
    chef_id             INT REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(50),
    address     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id       SERIAL PRIMARY KEY,
    customer_id    INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    department_id  INT REFERENCES departments(department_id) ON DELETE CASCADE,
    order_type     VARCHAR(50) DEFAULT 'DINE_IN',
    status         VARCHAR(30) CHECK (status IN ('PENDING','CONFIRMED','PREPARING','READY','DELIVERING','COMPLETED')) DEFAULT 'PENDING',
    total_amount   NUMERIC(12,2) DEFAULT 0.00,
    payment_status VARCHAR(30) DEFAULT 'PENDING',
    created_by     INT REFERENCES users(user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    INT REFERENCES products(product_id) ON DELETE CASCADE,
    quantity      INT NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL,
    notes         TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id     SERIAL PRIMARY KEY,
    order_id       INT REFERENCES orders(order_id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'SUCCESSFUL',
    processed_by   INT REFERENCES users(user_id),
    processed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_users_department        ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_inventory_department    ON inventory_items(department_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status        ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_stock_mov_item          ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status     ON inventory_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_products_department     ON products(department_id);
CREATE INDEX IF NOT EXISTS idx_orders_department       ON orders(department_id);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order       ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order          ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date     ON staff_schedules(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_batches_status          ON production_batches(status);
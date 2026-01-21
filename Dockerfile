# Build stage for dependencies
FROM composer:2.5 as composer
FROM php:8.2-fpm-alpine

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    libpng-dev \
    libzip-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    unzip \
    zip \
    git \
    curl \
    oniguruma-dev \
    postgresql-dev \
    icu-dev \
    tzdata

# Configure and install PHP extensions
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    && docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl

# Install Redis extension (optional, for caching)
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Install Composer
COPY --from=composer /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy backend files
COPY backend/ .

# Install dependencies with production flag but allow dev packages if needed
# For production: composer install --no-dev --optimize-autoloader
# For development: composer install
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Copy environment file if not exists
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate application key
RUN php artisan key:generate --ansi

# Set proper permissions for storage and cache directories
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Switch to non-root user
USER www-data

EXPOSE 9000

CMD ["php-fpm"]

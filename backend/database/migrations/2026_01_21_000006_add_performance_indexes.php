<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Posts indexes for better query performance
        Schema::table('posts', function (Blueprint $table) {
            $table->index(['status', 'published_at'], 'idx_posts_status_published');
            $table->index(['user_id', 'status'], 'idx_posts_author_status');
            $table->index(['slug', 'status'], 'idx_posts_slug_status');
            $table->index('created_at', 'idx_posts_created');
            $table->index('updated_at', 'idx_posts_updated');
        });

        // Activity logs index
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index('created_at', 'idx_activity_logs_created');
            $table->index(['user_id', 'created_at'], 'idx_activity_logs_user_created');
            $table->index(['subject_type', 'subject_id'], 'idx_activity_logs_subject');
        });

        // Newsletters index
        Schema::table('newsletters', function (Blueprint $table) {
            $table->index('status', 'idx_newsletters_status');
            $table->index(['status', 'scheduled_at'], 'idx_newsletters_status_scheduled');
            $table->index('created_at', 'idx_newsletters_created');
        });

        // Comments index
        Schema::table('comments', function (Blueprint $table) {
            $table->index(['post_id', 'status'], 'idx_comments_post_status');
            $table->index(['status', 'created_at'], 'idx_comments_status_created');
            $table->index('user_id', 'idx_comments_user');
        });

        // Media index
        Schema::table('media', function (Blueprint $table) {
            $table->index('mime_type', 'idx_media_mime_type');
            $table->index(['user_id', 'created_at'], 'idx_media_user_created');
            $table->index('created_at', 'idx_media_created');
        });

        // Users index
        Schema::table('users', function (Blueprint $table) {
            $table->index('email', 'idx_users_email');
            $table->index(['role', 'is_active'], 'idx_users_role_active');
            $table->index('created_at', 'idx_users_created');
        });

        // Categories index
        Schema::table('categories', function (Blueprint $table) {
            $table->index('slug', 'idx_categories_slug');
            $table->index('parent_id', 'idx_categories_parent');
        });

        // Tags index
        Schema::table('tags', function (Blueprint $table) {
            $table->index('slug', 'idx_tags_slug');
        });

        // Post assignments (workflow)
        if (Schema::hasTable('post_assignments')) {
            Schema::table('post_assignments', function (Blueprint $table) {
                $table->index(['post_id', 'role'], 'idx_post_assignments_post_role');
                $table->index(['user_id', 'role'], 'idx_post_assignments_user_role');
            });
        }

        // Post revisions
        if (Schema::hasTable('post_revisions')) {
            Schema::table('post_revisions', function (Blueprint $table) {
                $table->index(['post_id', 'created_at'], 'idx_post_revisions_post_created');
                $table->index('created_at', 'idx_post_revisions_created');
            });
        }

        // Social shares
        if (Schema::hasTable('social_shares')) {
            Schema::table('social_shares', function (Blueprint $table) {
                $table->index(['post_id', 'platform'], 'idx_social_shares_post_platform');
                $table->index('platform', 'idx_social_shares_platform');
                $table->index('shared_at', 'idx_social_shares_shared');
            });
        }

        // Page analytics
        if (Schema::hasTable('page_analytics')) {
            Schema::table('page_analytics', function (Blueprint $table) {
                $table->index(['post_id', 'created_at'], 'idx_page_analytics_post_created');
                $table->index(['url', 'created_at'], 'idx_page_analytics_url_created');
                $table->index('session_id', 'idx_page_analytics_session');
                $table->index('user_id', 'idx_page_analytics_user');
                $table->index('created_at', 'idx_page_analytics_created');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('idx_posts_status_published');
            $table->dropIndex('idx_posts_author_status');
            $table->dropIndex('idx_posts_slug_status');
            $table->dropIndex('idx_posts_created');
            $table->dropIndex('idx_posts_updated');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('idx_activity_logs_created');
            $table->dropIndex('idx_activity_logs_user_created');
            $table->dropIndex('idx_activity_logs_subject');
        });

        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropIndex('idx_newsletters_status');
            $table->dropIndex('idx_newsletters_status_scheduled');
            $table->dropIndex('idx_newsletters_created');
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->dropIndex('idx_comments_post_status');
            $table->dropIndex('idx_comments_status_created');
            $table->dropIndex('idx_comments_user');
        });

        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex('idx_media_mime_type');
            $table->dropIndex('idx_media_user_created');
            $table->dropIndex('idx_media_created');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_email');
            $table->dropIndex('idx_users_role_active');
            $table->dropIndex('idx_users_created');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('idx_categories_slug');
            $table->dropIndex('idx_categories_parent');
        });

        Schema::table('tags', function (Blueprint $table) {
            $table->dropIndex('idx_tags_slug');
        });

        if (Schema::hasTable('post_assignments')) {
            Schema::table('post_assignments', function (Blueprint $table) {
                $table->dropIndex('idx_post_assignments_post_role');
                $table->dropIndex('idx_post_assignments_user_role');
            });
        }

        if (Schema::hasTable('post_revisions')) {
            Schema::table('post_revisions', function (Blueprint $table) {
                $table->dropIndex('idx_post_revisions_post_created');
                $table->dropIndex('idx_post_revisions_created');
            });
        }

        if (Schema::hasTable('social_shares')) {
            Schema::table('social_shares', function (Blueprint $table) {
                $table->dropIndex('idx_social_shares_post_platform');
                $table->dropIndex('idx_social_shares_platform');
                $table->dropIndex('idx_social_shares_shared');
            });
        }

        if (Schema::hasTable('page_analytics')) {
            Schema::table('page_analytics', function (Blueprint $table) {
                $table->dropIndex('idx_page_analytics_post_created');
                $table->dropIndex('idx_page_analytics_url_created');
                $table->dropIndex('idx_page_analytics_session');
                $table->dropIndex('idx_page_analytics_user');
                $table->dropIndex('idx_page_analytics_created');
            });
        }
    }
};

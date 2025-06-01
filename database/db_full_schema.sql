{
  "tables": [
    {
      "name": "user_credit_cards",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "card_name",
          "type": "text",
          "nullable": false
        },
        {
          "name": "card_brand",
          "type": "text",
          "nullable": false
        },
        {
          "name": "card_category",
          "type": "text",
          "nullable": false
        },
        {
          "name": "annual_fee",
          "type": "numeric",
          "nullable": true
        },
        {
          "name": "is_active",
          "type": "boolean",
          "nullable": false,
          "default": false
        },
        {
          "name": "renewal_date",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "foreign_keys": [
        {
          "column": "user_id",
          "references": {
            "table": "auth.users",
            "column": "id"
          }
        }
      ]
    },
    {
      "name": "perk_definitions",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "name",
          "type": "text",
          "nullable": false
        },
        {
          "name": "description",
          "type": "text",
          "nullable": true
        },
        {
          "name": "value",
          "type": "numeric",
          "nullable": false
        },
        {
          "name": "period_months",
          "type": "int4",
          "nullable": false
        },
        {
          "name": "reset_type",
          "type": "perk_reset_type", 
          "nullable": false
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "foreign_keys": []
    },
    {
      "name": "perk_eligible_services",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "perk_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "service_name",
          "type": "text",
          "nullable": false
        },
        {
          "name": "service_url",
          "type": "text",
          "nullable": true
        },
        {
          "name": "app_deep_link",
          "type": "text",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "foreign_keys": [
        {
          "column": "perk_id",
          "references": {
            "table": "perk_definitions",
            "column": "id"
          }
        }
      ]
    },
    {
      "name": "perk_redemptions",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "user_card_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "perk_id",
          "type": "uuid",
          "nullable": false
        },
        {
          "name": "redemption_date",
          "type": "timestamptz",
          "nullable": false
        },
        {
          "name": "reset_date",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "status",
          "type": "text",
          "nullable": false
        },
        {
          "name": "value_redeemed",
          "type": "numeric",
          "nullable": false
        },
        {
          "name": "is_auto_redemption",
          "type": "boolean",
          "nullable": false,
          "default": false
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "foreign_keys": [
        {
          "column": "user_id",
          "references": {
            "table": "auth.users",
            "column": "id"
          }
        },
        {
          "column": "user_card_id",
          "references": {
            "table": "user_credit_cards",
            "column": "id"
          }
        },
        {
          "column": "perk_id",
          "references": {
            "table": "perk_definitions",
            "column": "id"
          }
        }
      ]
    },
    {
      "name": "profiles",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "email",
          "type": "text",
          "nullable": false
        },
        {
          "name": "full_name",
          "type": "text",
          "nullable": true
        },
        {
          "name": "avatar_url",
          "type": "text",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "foreign_keys": [
        {
          "column": "id",
          "references": {
            "table": "auth.users",
            "column": "id"
          }
        }
      ]
    }
  ]
}

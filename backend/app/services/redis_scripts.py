READ_AND_DELETE_SCRIPT = """
local value = redis.call(
    'GET',
    KEYS[1]
)

if not value then
    return nil
end

local data = cjson.decode(value)

data.views_remaining =
    data.views_remaining - 1

if data.views_remaining <= 0 then

    redis.call(
        'DEL',
        KEYS[1]
    )

else

    redis.call(
        'SET',
        KEYS[1],
        cjson.encode(data),
        'KEEPTTL'
    )

end

return cjson.encode(data)
"""
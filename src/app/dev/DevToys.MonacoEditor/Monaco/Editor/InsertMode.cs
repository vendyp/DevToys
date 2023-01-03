﻿using Newtonsoft.Json;

namespace DevToys.MonacoEditor.Monaco.Editor;

/// <summary>
/// Overwrite word ends on accept. Default to false.
/// </summary>
[JsonConverter(typeof(InsertModeConverter))]
public enum InsertMode { Insert, Replace };

internal class InsertModeConverter : JsonConverter
{
    public override bool CanConvert(Type t) => t == typeof(InsertMode) || t == typeof(InsertMode?);

    public override object? ReadJson(JsonReader reader, Type t, object? existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null)
            return null;
        string? value = serializer.Deserialize<string>(reader);
        return value switch
        {
            "insert" => InsertMode.Insert,
            "replace" => (object)InsertMode.Replace,
            _ => throw new Exception("Cannot unmarshal type InsertMode"),
        };
    }

    public override void WriteJson(JsonWriter writer, object? untypedValue, JsonSerializer serializer)
    {
        if (untypedValue == null)
        {
            serializer.Serialize(writer, null);
            return;
        }
        var value = (InsertMode)untypedValue;
        switch (value)
        {
            case InsertMode.Insert:
                serializer.Serialize(writer, "insert");
                return;
            case InsertMode.Replace:
                serializer.Serialize(writer, "replace");
                return;
        }
        throw new Exception("Cannot marshal type InsertMode");
    }
}

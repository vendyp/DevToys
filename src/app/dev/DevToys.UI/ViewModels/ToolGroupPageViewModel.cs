﻿using CommunityToolkit.Mvvm.Collections;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DevToys.Core.Tools;
using DevToys.Core.Tools.Metadata;
using DevToys.Core.Tools.ViewItems;
using DevToys.Localization.Strings.MainMenu;
using Microsoft.UI.Xaml.Controls;

namespace DevToys.UI.ViewModels;

[Export]
[PartCreationPolicy(CreationPolicy.NonShared)]
internal sealed partial class ToolGroupPageViewModel : ObservableRecipient
{
#pragma warning disable IDE0044 // Add readonly modifier
    [Import]
    private GuiToolProvider _guiToolProvider = null!;
#pragma warning restore IDE0044 // Add readonly modifier

    [ObservableProperty]
    private ObservableGroupedCollection<string, GuiToolInstance>? _tools = null;

    [ObservableProperty]
    private string _headerText = string.Empty;

    [ObservableProperty]
    private bool _displayFooter;

    internal void Load(GroupViewItem groupViewItem)
    {
        Guard.IsNotNull(groupViewItem);

        if (string.Equals(groupViewItem.InternalName, ReservedGuiToolGroupNames.AllTools, StringComparison.OrdinalIgnoreCase))
        {
            Tools = LoadAllTools();
            DisplayFooter = true;
        }
        else if (string.Equals(groupViewItem.InternalName, ReservedGuiToolGroupNames.FavoriteTools, StringComparison.OrdinalIgnoreCase))
        {
            Tools = LoadFavoriteTools();
        }
        else
        {
            Tools = LoadToolsGroup(groupViewItem.InternalName);
        }

        HeaderText = groupViewItem.DisplayTitle;
    }

    [RelayCommand]
    private static void ToolSelected(ItemClickEventArgs args)
    {
        if (args.ClickedItem is not null && args.ClickedItem is GuiToolInstance tool)
        {
            //WeakReferenceMessenger.Default.Send(
            //    new TrainingWindowNavigateToPageMessage(
            //        typeof(AppDetailPageViewModel),
            //        app.Model,
            //        NavigationTransition.Entrance,
            //        referenceConnectedAnimationObject: app));
        }
    }

    private ObservableGroupedCollection<string, GuiToolInstance> LoadAllTools()
    {
        var results = new ObservableGroupedCollection<string, GuiToolInstance>();

        // Recent tools group.
        ObservableGroup<string, GuiToolInstance> recentToolsGroup
            = new(MainMenu.RecentToolsDisplayTitle, _guiToolProvider.GetMostRecentUsedTools());
        if (recentToolsGroup.Count > 0)
        {
            results.Add(recentToolsGroup);
        }

        // Favorite tools group & every other tools group.
        var favoriteToolsGroup = new List<GuiToolInstance>();
        var everyOtherToolsGroup = new List<GuiToolInstance>();
        for (int i = 0; i < _guiToolProvider.AllTools.Count; i++)
        {
            GuiToolInstance tool = _guiToolProvider.AllTools[i];
            bool isFavorite = _guiToolProvider.GetToolIsFavorite(tool);
            if (isFavorite)
            {
                favoriteToolsGroup.Add(tool);
            }
            else
            {
                everyOtherToolsGroup.Add(tool);
            }
        }

        if (favoriteToolsGroup.Count > 0)
        {
            string title;
            if (recentToolsGroup.Count == 0 && everyOtherToolsGroup.Count == 0)
            {
                title = string.Empty;
            }
            else
            {
                title = MainMenu.FavoriteToolsDisplayTitle;
            }

            results.Add(new(title, favoriteToolsGroup));
        }

        if (everyOtherToolsGroup.Count > 0)
        {
            string title;
            if (recentToolsGroup.Count == 0 && favoriteToolsGroup.Count == 0)
            {
                title = string.Empty;
            }
            else
            {
                title = MainMenu.AllToolsDisplayTitle;
            }
            results.Add(new(title, everyOtherToolsGroup));
        }

        return results;
    }

    private ObservableGroupedCollection<string, GuiToolInstance> LoadFavoriteTools()
    {
        var favoriteTools = new List<GuiToolInstance>();
        for (int i = 0; i < _guiToolProvider.AllTools.Count; i++)
        {
            GuiToolInstance tool = _guiToolProvider.AllTools[i];
            bool isFavorite = _guiToolProvider.GetToolIsFavorite(tool);
            if (isFavorite)
            {
                favoriteTools.Add(tool);
            }
        }

        return new ObservableGroupedCollection<string, GuiToolInstance>(
            favoriteTools.GroupBy(static tool => string.Empty /* Group display name */));
    }

    private ObservableGroupedCollection<string, GuiToolInstance> LoadToolsGroup(string groupName)
    {
        var tools = new List<GuiToolInstance>();
        for (int i = 0; i < _guiToolProvider.AllTools.Count; i++)
        {
            GuiToolInstance tool = _guiToolProvider.AllTools[i];
            if (string.Equals(tool.GroupName, groupName, StringComparison.Ordinal))
            {
                tools.Add(tool);
            }
        }

        return new ObservableGroupedCollection<string, GuiToolInstance>(
            tools.GroupBy(static tool => string.Empty /* Group display name */));
    }
}
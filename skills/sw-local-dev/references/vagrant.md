# Vagrant

A project with a `Vagrantfile`. PHP, Composer and Node run in the VM; the
host only runs `vagrant`.

- **DEV-004** In a Vagrant project, run commands through `vagrant ssh -c`
  and `cd` to the guest path the `Vagrantfile` syncs the project to
  (`/vagrant` by default) first. Name the machine when the `Vagrantfile`
  defines several, and run `vagrant rsync` first when the folder is synced
  with `type: "rsync"`.

## Find the folder

Vagrant syncs the project folder to `/vagrant` unless the `Vagrantfile`
says otherwise with `config.vm.synced_folder ".", "<guest path>"`. Read the
`Vagrantfile` and `cd` to that guest path in every command; without it the
command runs in the SSH user's home and finds no `vendor/`.

## Pick the machine

A `Vagrantfile` with several `config.vm.define` blocks is a multi-machine
setup. Commands that target one machine, such as `vagrant ssh`, then need its
name (`vagrant ssh app -c "…"`), unless one block is marked
`primary: true`. Run PHP in the machine whose block syncs the project
folder, not the database machine.

## rsync folders

`type: "rsync"` copies the project into the VM once, on `vagrant up` or
`vagrant reload`, and never back. A test run after an edit on the host sees
the old code unless `vagrant rsync` runs first, and `vendor/` from a
`composer install` in the VM never shows up on the host:

```bash
vagrant rsync app
vagrant ssh app -c "cd /var/www/shopware && vendor/bin/phpunit --filter CartProcessorTest"
```

## Commands

```bash
vagrant ssh -c "cd /vagrant && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh -c "cd /vagrant && composer phpstan"
vagrant ssh -c "cd /vagrant && bin/console cache:clear"
vagrant ssh -c "cd /vagrant/src/Administration/Resources/app/administration && npm run lint"
```

Replace `/vagrant` with the synced folder of the `Vagrantfile`. Check the
VM with `vagrant status`; start it with `vagrant up`.

## Mistakes

| Wrong | Right |
| ----- | ----- |
| PHP tools on the host | `vagrant ssh -c "cd <guest path> && …"` |
| `vagrant ssh -c "vendor/bin/phpunit"` without `cd` | `cd <guest path> &&` first |
| `/vagrant` when the `Vagrantfile` syncs elsewhere | the `synced_folder` guest path |
| `vagrant ssh -c` in a multi-machine setup | `vagrant ssh <machine> -c` |
| Testing host edits in an rsync folder without syncing | `vagrant rsync` first |
